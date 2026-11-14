"""AI and smart suggestion endpoints for teammate ranking, skill-gap analysis, and feedback."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, require_admin
from app.database.session import get_db
from app.models.ai import AIFeedback, AIRun
from app.models.profile import Profile, UserSkill
from app.models.skill import Skill
from app.models.team import InviteStatus, MemberStatus, Team, TeamInvite, TeamMember
from app.models.user import User, UserRole
from app.schemas.ai import (
    AIFeedbackCreate,
    AIFeedbackOut,
    CandidateOut,
    CandidateScoreBreakdown,
    FeedbackCommentOut,
    FeedbackSummaryOut,
    SkillGapItem,
    SkillGapOut,
    SkillGapSummary,
    TeammateRecommendationsOut,
)
from app.services.ai.scoring import compute_team_mode_availability, score_candidate
from app.services.ai.skill_gap import (
    analyze_skill_gap,
    compute_category_strengths,
    determine_c_target,
)

router = APIRouter(prefix="/ai", tags=["ai"])


def _check_team_membership(team: Team, user: User) -> None:
    is_leader = team.leader_id == user.id
    is_active_member = any(m.user_id == user.id and m.status == MemberStatus.active for m in team.members)
    if not (is_leader or is_active_member):
        raise HTTPException(status_code=403, detail="You do not have access to this team's AI features")


@router.get("/teams/{team_id}/recommendations", response_model=TeammateRecommendationsOut)
def get_teammate_recommendations(
    team_id: UUID,
    limit: int = Query(default=10, ge=1, le=20),
    min_score: float = Query(default=0.0, ge=0.0, le=100.0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeammateRecommendationsOut:
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    _check_team_membership(team, user)

    active_members = [m for m in team.members if m.status == MemberStatus.active]
    team_mode = compute_team_mode_availability(active_members)
    category_strengths = compute_category_strengths(active_members)

    # Known skills in DB
    all_skills = db.scalars(select(Skill)).all()
    known_skills_by_name = {s.name.lower(): s for s in all_skills}

    # Skill-gap if problem selected
    skill_gap_result = None
    if team.problem_selection and team.problem_selection.problem:
        skill_gap_result = analyze_skill_gap(
            team.problem_selection.problem.required_technologies,
            active_members,
            known_skills_by_name,
        )

    c_target = determine_c_target(skill_gap_result, category_strengths)

    # Hackathon and problem target domains
    target_domains: set[str] = set()
    if team.hackathon:
        for d in getattr(team.hackathon, "domains", []) or []:
            name = getattr(d, "name", str(d)).strip().lower()
            if name:
                target_domains.add(name)
    if team.problem_selection and team.problem_selection.problem:
        p_dom = (team.problem_selection.problem.domain or "").strip().lower()
        if p_dom:
            target_domains.add(p_dom)

    # Candidate pool query:
    # 1. Active student users
    # 2. Exclude anyone who is or was a member of this team (in any status)
    # 3. Exclude anyone who is an active member of any other team
    past_or_present_members = select(TeamMember.user_id).where(TeamMember.team_id == team.id)
    other_active_members = select(TeamMember.user_id).where(
        TeamMember.status == MemberStatus.active,
        TeamMember.team_id != team.id,
    )

    candidate_stmt = (
        select(User)
        .options(
            joinedload(User.skills).joinedload(UserSkill.skill),
            joinedload(User.domains),
            joinedload(User.preferred_roles),
            joinedload(User.profile),
        )
        .where(
            User.is_active == True,
            User.role == UserRole.student,
            User.id.not_in(past_or_present_members),
            User.id.not_in(other_active_members),
        )
    )
    raw_candidates = db.scalars(candidate_stmt).unique().all()

    # Pending invites check
    pending_invites = db.scalars(
        select(TeamInvite.invitee_id).where(
            TeamInvite.team_id == team.id,
            TeamInvite.status == InviteStatus.pending,
        )
    ).all()
    pending_invite_ids = set(pending_invites)

    scored_candidates: list[dict[str, Any]] = []
    excluded_incomplete_count = 0

    for cand in raw_candidates:
        skills = getattr(cand, "skills", []) or []
        if len(skills) == 0:
            excluded_incomplete_count += 1
            continue

        score_res = score_candidate(cand, c_target, target_domains, team_mode)
        if score_res["score"] < min_score:
            continue

        scored_candidates.append(
            {
                "id": cand.id,
                "full_name": cand.full_name,
                "college": cand.college,
                "branch": cand.branch,
                "year": cand.year,
                "score": score_res["score"],
                "features": score_res["features"],
                "reasons": score_res["reasons"],
                "invite_pending": cand.id in pending_invite_ids,
            }
        )

    # Deterministic tie-breaking:
    # 1. score DESC
    # 2. full_name ASC (case-insensitive)
    # 3. id ASC
    scored_candidates.sort(
        key=lambda c: (-c["score"], (c["full_name"] or "").lower(), str(c["id"]))
    )
    results = scored_candidates[:limit]

    # Log in ai_runs (strictly candidate IDs, scores, features, C_target, parameters: zero emails or free text)
    input_json = {
        "team_id": str(team.id),
        "limit": limit,
        "min_score": min_score,
        "c_target": c_target,
    }
    output_json = {
        "c_target": c_target,
        "excluded_incomplete_count": excluded_incomplete_count,
        "results": [
            {
                "id": str(c["id"]),
                "score": c["score"],
                "features": c["features"],
                "invite_pending": c["invite_pending"],
            }
            for c in results
        ],
    }
    run = AIRun(
        feature="teammate_recommendation",
        user_id=user.id,
        team_id=team.id,
        input_json=input_json,
        output_json=output_json,
        model_version="weighted-v1",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    return TeammateRecommendationsOut(
        run_id=run.id,
        c_target=c_target,
        excluded_incomplete_count=excluded_incomplete_count,
        recommendations=[CandidateOut(**c) for c in results],
    )


@router.get("/teams/{team_id}/skill-gap", response_model=SkillGapOut)
def get_team_skill_gap(
    team_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SkillGapOut:
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    _check_team_membership(team, user)

    if not team.problem_selection or not team.problem_selection.problem:
        raise HTTPException(status_code=400, detail="Team has not selected a problem statement")

    problem = team.problem_selection.problem
    active_members = [m for m in team.members if m.status == MemberStatus.active]

    all_skills = db.scalars(select(Skill)).all()
    known_skills_by_name = {s.name.lower(): s for s in all_skills}

    gap_res = analyze_skill_gap(
        problem.required_technologies,
        active_members,
        known_skills_by_name,
    )

    # Log in ai_runs
    input_json = {
        "team_id": str(team.id),
        "problem_id": str(problem.id),
    }
    output_json = {
        "problem_id": str(problem.id),
        "summary": gap_res["summary"],
    }
    run = AIRun(
        feature="skill_gap",
        user_id=user.id,
        team_id=team.id,
        input_json=input_json,
        output_json=output_json,
        model_version="weighted-v1",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    return SkillGapOut(
        run_id=run.id,
        problem_id=problem.id,
        problem_title=problem.title,
        problem_code=problem.code,
        covered=[SkillGapItem(**it) for it in gap_res["covered"]],
        partial=[SkillGapItem(**it) for it in gap_res["partial"]],
        missing=[SkillGapItem(**it) for it in gap_res["missing"]],
        unclassified=gap_res["unclassified"],
        summary=SkillGapSummary(**gap_res["summary"]),
    )


@router.post("/feedback", response_model=AIFeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_ai_feedback(
    payload: AIFeedbackCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AIFeedbackOut:
    if payload.rating not in {1, -1}:
        raise HTTPException(status_code=422, detail="Rating must be +1 or -1")

    run = db.get(AIRun, payload.run_id)
    if not run:
        raise HTTPException(status_code=404, detail="AI run not found")

    if not run.team_id:
        raise HTTPException(status_code=400, detail="Run team no longer exists")

    team = db.get(Team, run.team_id)
    if not team:
        raise HTTPException(status_code=400, detail="Run team no longer exists")

    _check_team_membership(team, user)

    # Candidate validation
    if payload.candidate_id is not None:
        run_results = run.output_json.get("results", [])
        valid_candidate_ids = {r.get("id") for r in run_results if isinstance(r, dict)}
        if str(payload.candidate_id) not in valid_candidate_ids:
            raise HTTPException(status_code=400, detail="candidate_id was not part of this run")

    # Upsert in code
    existing = db.scalar(
        select(AIFeedback).where(
            AIFeedback.run_id == run.id,
            AIFeedback.user_id == user.id,
            AIFeedback.candidate_id == payload.candidate_id,
        )
    )
    if existing:
        existing.rating = payload.rating
        existing.comment = payload.comment
        existing.created_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    feedback = AIFeedback(
        run_id=run.id,
        user_id=user.id,
        candidate_id=payload.candidate_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("/feedback/summary", response_model=FeedbackSummaryOut)
def get_feedback_summary(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> FeedbackSummaryOut:
    total_runs = db.scalar(select(func.count(AIRun.id))) or 0
    feedbacks = db.scalars(
        select(AIFeedback).options(joinedload(AIFeedback.run)).order_by(AIFeedback.created_at.desc())
    ).all()

    total_feedback = len(feedbacks)
    positive_count = len([f for f in feedbacks if f.rating == 1])
    negative_count = len([f for f in feedbacks if f.rating == -1])
    satisfaction_rate = round(positive_count / total_feedback * 100.0, 1) if total_feedback > 0 else 0.0

    # Calculate average features for +1 and -1 ratings
    up_features: list[dict[str, float]] = []
    down_features: list[dict[str, float]] = []

    for f in feedbacks:
        if not f.candidate_id or not f.run or not f.run.output_json:
            continue
        results = f.run.output_json.get("results", [])
        cand_data = next((r for r in results if r.get("id") == str(f.candidate_id)), None)
        if not cand_data or "features" not in cand_data:
            continue
        feats = cand_data["features"]
        if f.rating == 1:
            up_features.append(feats)
        elif f.rating == -1:
            down_features.append(feats)

    def _avg_features(feature_list: list[dict[str, float]]) -> CandidateScoreBreakdown:
        if not feature_list:
            return CandidateScoreBreakdown(
                category_complement=0.0,
                skill_depth=0.0,
                domain_overlap=0.0,
                availability=0.0,
                preferred_role=0.0,
            )
        n = len(feature_list)
        return CandidateScoreBreakdown(
            category_complement=round(sum(f.get("category_complement", 0.0) for f in feature_list) / n, 4),
            skill_depth=round(sum(f.get("skill_depth", 0.0) for f in feature_list) / n, 4),
            domain_overlap=round(sum(f.get("domain_overlap", 0.0) for f in feature_list) / n, 4),
            availability=round(sum(f.get("availability", 0.0) for f in feature_list) / n, 4),
            preferred_role=round(sum(f.get("preferred_role", 0.0) for f in feature_list) / n, 4),
        )

    # Recent comments (limit to 20 most recent)
    recent_comments: list[FeedbackCommentOut] = []
    for f in feedbacks:
        if f.comment and f.comment.strip():
            recent_comments.append(
                FeedbackCommentOut(
                    rating=f.rating,
                    comment=f.comment.strip(),
                    created_at=f.created_at,
                )
            )
            if len(recent_comments) >= 20:
                break

    return FeedbackSummaryOut(
        total_runs=total_runs,
        total_feedback=total_feedback,
        positive_count=positive_count,
        negative_count=negative_count,
        satisfaction_rate=satisfaction_rate,
        avg_features_up=_avg_features(up_features),
        avg_features_down=_avg_features(down_features),
        recent_comments=recent_comments,
    )
