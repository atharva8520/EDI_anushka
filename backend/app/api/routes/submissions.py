"""Routes for Module 7: Project Submissions, Judging & Evaluations, and Hackathon Leaderboard."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, require_admin
from app.database.session import get_db
from app.models.evaluation import CriterionScore, ProjectEvaluation
from app.models.hackathon import Hackathon, HackathonProblem, JudgingCriterion
from app.models.project import Project
from app.models.team import MemberStatus, Team, TeamMember, TeamProblemSelection
from app.models.user import User, UserRole
from app.schemas.evaluation import CriterionScoreOut, EvaluationCreate, EvaluationOut, LeaderboardItemOut
from app.schemas.submission import ProjectSubmitRequest, ProjectSubmissionOut
from app.services.project_service import check_project_access, log_activity

router = APIRouter(tags=["submissions-judging"])


# =========================================================================
# 1. Project Submissions
# =========================================================================


@router.post("/projects/{project_id}/submit", response_model=ProjectSubmissionOut)
def submit_project(
    project_id: UUID,
    payload: ProjectSubmitRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.scalar(
        select(Project)
        .options(
            selectinload(Project.team).selectinload(Team.members),
            selectinload(Project.submitter),
        )
        .where(Project.id == project_id)
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    team, _ = check_project_access(project, user, write=True)

    project.repo_url = payload.repo_url
    project.demo_url = payload.demo_url
    project.video_url = payload.video_url
    project.pitch_deck_url = payload.pitch_deck_url
    project.tech_stack = payload.tech_stack
    project.submission_notes = payload.submission_notes
    project.is_submitted = True
    project.submitted_at = datetime.now(timezone.utc)
    project.submitted_by = user.id

    log_activity(
        db=db,
        project_id=project_id,
        actor_id=user.id,
        action="project_submitted",
        entity_type="project",
        entity_id=project_id,
        details={"repo_url": payload.repo_url, "actor_name": user.full_name},
    )

    db.commit()
    db.refresh(project)

    return ProjectSubmissionOut(
        id=project.id,
        team_id=team.id,
        team_name=team.name,
        title=project.title,
        summary=project.summary,
        repo_url=project.repo_url,
        demo_url=project.demo_url,
        video_url=project.video_url,
        pitch_deck_url=project.pitch_deck_url,
        tech_stack=project.tech_stack or [],
        is_submitted=project.is_submitted,
        submitted_at=project.submitted_at,
        submitted_by=project.submitted_by,
        submitted_by_name=user.full_name,
        submission_notes=project.submission_notes,
    )


@router.get("/projects/{project_id}/submission", response_model=ProjectSubmissionOut)
def get_project_submission(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.scalar(
        select(Project)
        .options(
            selectinload(Project.team).selectinload(Team.members),
            selectinload(Project.submitter),
        )
        .where(Project.id == project_id)
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    team, _ = check_project_access(project, user, write=False)

    return ProjectSubmissionOut(
        id=project.id,
        team_id=team.id,
        team_name=team.name,
        title=project.title,
        summary=project.summary,
        repo_url=project.repo_url,
        demo_url=project.demo_url,
        video_url=project.video_url,
        pitch_deck_url=project.pitch_deck_url,
        tech_stack=project.tech_stack or [],
        is_submitted=project.is_submitted,
        submitted_at=project.submitted_at,
        submitted_by=project.submitted_by,
        submitted_by_name=project.submitter.full_name if project.submitter else None,
        submission_notes=project.submission_notes,
    )


# =========================================================================
# 2. Judging & Evaluations
# =========================================================================


@router.post("/projects/{project_id}/evaluations", response_model=EvaluationOut)
def evaluate_project(
    project_id: UUID,
    payload: EvaluationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only organizers and judges may evaluate projects")

    project = db.scalar(
        select(Project)
        .options(
            selectinload(Project.team).selectinload(Team.hackathon).selectinload(Hackathon.criteria),
        )
        .where(Project.id == project_id)
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.is_submitted:
        raise HTTPException(status_code=400, detail="Project has not been submitted yet")

    hackathon = project.team.hackathon
    criteria_by_id = {c.id: c for c in hackathon.criteria}

    # Validate criterion scores
    weighted_sum = 0.0
    total_weights = 0
    scores_to_record = []

    for item in payload.scores:
        if item.criterion_id not in criteria_by_id:
            raise HTTPException(status_code=400, detail=f"Criterion {item.criterion_id} does not belong to this hackathon")
        criterion = criteria_by_id[item.criterion_id]
        weighted_sum += item.score * criterion.weight
        total_weights += criterion.weight
        scores_to_record.append((criterion, item.score, item.notes))

    total_score = round((weighted_sum / total_weights) * 10, 2) if total_weights > 0 else 0.0

    # Upsert evaluation for this judge & project
    evaluation = db.scalar(
        select(ProjectEvaluation)
        .options(selectinload(ProjectEvaluation.criterion_scores))
        .where(ProjectEvaluation.project_id == project_id, ProjectEvaluation.judge_id == user.id)
    )

    if not evaluation:
        evaluation = ProjectEvaluation(
            project_id=project_id,
            hackathon_id=hackathon.id,
            judge_id=user.id,
            feedback=payload.feedback,
            total_score=total_score,
        )
        db.add(evaluation)
        db.flush()
    else:
        evaluation.feedback = payload.feedback
        evaluation.total_score = total_score
        for cs in list(evaluation.criterion_scores):
            db.delete(cs)
        db.flush()

    out_scores = []
    for criterion, score_val, score_notes in scores_to_record:
        cs = CriterionScore(
            evaluation_id=evaluation.id,
            criterion_id=criterion.id,
            score=score_val,
            notes=score_notes,
        )
        db.add(cs)
        out_scores.append(
            CriterionScoreOut(
                criterion_id=criterion.id,
                criterion_title=criterion.title,
                criterion_weight=criterion.weight,
                score=score_val,
                notes=score_notes,
            )
        )

    db.commit()
    db.refresh(evaluation)

    return EvaluationOut(
        id=evaluation.id,
        project_id=project.id,
        hackathon_id=hackathon.id,
        judge_id=user.id,
        judge_name=user.full_name,
        total_score=evaluation.total_score,
        feedback=evaluation.feedback,
        scores=out_scores,
        created_at=evaluation.created_at,
        updated_at=evaluation.updated_at,
    )


@router.get("/projects/{project_id}/evaluations", response_model=list[EvaluationOut])
def get_project_evaluations(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.scalar(
        select(Project)
        .options(
            selectinload(Project.team).selectinload(Team.members),
            selectinload(Project.evaluations).selectinload(ProjectEvaluation.judge),
            selectinload(Project.evaluations).selectinload(ProjectEvaluation.criterion_scores).selectinload(CriterionScore.criterion),
        )
        .where(Project.id == project_id)
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    check_project_access(project, user, write=False)

    results = []
    for ev in project.evaluations:
        scores_out = [
            CriterionScoreOut(
                criterion_id=cs.criterion_id,
                criterion_title=cs.criterion.title if cs.criterion else "Criterion",
                criterion_weight=cs.criterion.weight if cs.criterion else 1,
                score=cs.score,
                notes=cs.notes,
            )
            for cs in ev.criterion_scores
        ]
        results.append(
            EvaluationOut(
                id=ev.id,
                project_id=project.id,
                hackathon_id=ev.hackathon_id,
                judge_id=ev.judge_id,
                judge_name=ev.judge.full_name if ev.judge else "Judge",
                total_score=ev.total_score,
                feedback=ev.feedback,
                scores=scores_out,
                created_at=ev.created_at,
                updated_at=ev.updated_at,
            )
        )
    return results


# =========================================================================
# 3. Hackathon Leaderboard & Submissions Showcase
# =========================================================================


@router.get("/hackathons/{hackathon_id}/leaderboard", response_model=list[LeaderboardItemOut])
def get_hackathon_leaderboard(
    hackathon_id: UUID,
    db: Session = Depends(get_db),
):
    hackathon = db.scalar(
        select(Hackathon)
        .options(
            selectinload(Hackathon.teams)
            .selectinload(Team.project)
            .selectinload(Project.evaluations),
            selectinload(Hackathon.teams)
            .selectinload(Team.problem_selection)
            .selectinload(TeamProblemSelection.problem),
        )
        .where(Hackathon.id == hackathon_id)
    )
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    ranked_candidates = []

    for team in hackathon.teams:
        project = team.project
        if not project or not project.is_submitted:
            continue

        evaluations = project.evaluations or []
        eval_count = len(evaluations)
        if eval_count > 0:
            avg_score = round(sum(e.total_score for e in evaluations) / eval_count, 2)
        else:
            avg_score = 0.0

        problem_title = None
        problem_domain = None
        if team.problem_selection and team.problem_selection.problem:
            problem_title = team.problem_selection.problem.title
            problem_domain = team.problem_selection.problem.domain

        ranked_candidates.append(
            {
                "project_id": project.id,
                "project_title": project.title,
                "team_id": team.id,
                "team_name": team.name,
                "problem_title": problem_title,
                "problem_domain": problem_domain,
                "repo_url": project.repo_url,
                "demo_url": project.demo_url,
                "tech_stack": project.tech_stack or [],
                "average_score": avg_score,
                "evaluation_count": eval_count,
            }
        )

    # Sort descending by average score, then alphabetically by project title
    ranked_candidates.sort(key=lambda x: (x["average_score"], x["evaluation_count"]), reverse=True)

    leaderboard = []
    for idx, item in enumerate(ranked_candidates, start=1):
        badge = None
        if idx == 1:
            badge = "Winner - 1st Place"
        elif idx == 2:
            badge = "Runner Up - 2nd Place"
        elif idx == 3:
            badge = "3rd Place"
        elif item["evaluation_count"] > 0:
            badge = "Finalist"

        leaderboard.append(
            LeaderboardItemOut(
                rank=idx,
                badge=badge,
                **item,
            )
        )

    return leaderboard


@router.get("/hackathons/{hackathon_id}/submissions", response_model=list[ProjectSubmissionOut])
def get_hackathon_submissions(
    hackathon_id: UUID,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    hackathon = db.scalar(
        select(Hackathon)
        .options(
            selectinload(Hackathon.teams).selectinload(Team.project).selectinload(Project.submitter),
        )
        .where(Hackathon.id == hackathon_id)
    )
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    submissions = []
    for team in hackathon.teams:
        proj = team.project
        if proj and proj.is_submitted:
            submissions.append(
                ProjectSubmissionOut(
                    id=proj.id,
                    team_id=team.id,
                    team_name=team.name,
                    title=proj.title,
                    summary=proj.summary,
                    repo_url=proj.repo_url,
                    demo_url=proj.demo_url,
                    video_url=proj.video_url,
                    pitch_deck_url=proj.pitch_deck_url,
                    tech_stack=proj.tech_stack or [],
                    is_submitted=proj.is_submitted,
                    submitted_at=proj.submitted_at,
                    submitted_by=proj.submitted_by,
                    submitted_by_name=proj.submitter.full_name if proj.submitter else None,
                    submission_notes=proj.submission_notes,
                )
            )

    # Sort by submission date desc
    submissions.sort(key=lambda x: x.submitted_at or datetime.min, reverse=True)
    return submissions
