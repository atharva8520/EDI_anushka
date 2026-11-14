from app.models.hackathon import Hackathon
from app.models.profile import PreviousProject
from app.models.team import MemberStatus, Team
from app.models.user import User
from app.schemas.hackathon import CriterionOut, HackathonListItem, HackathonOut, ProblemOut, ProblemSummary
from app.schemas.profile import PreviousProjectOut, ProfileOut, UserSkillOut
from app.schemas.team import MemberOut, SelectedProblemOut, TeamOut
from app.services.profile_service import profile_completion


def serialize_profile(user: User) -> ProfileOut:
    percent, missing = profile_completion(user)
    profile = user.profile
    return ProfileOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        college=user.college,
        branch=user.branch,
        year=user.year,
        bio=profile.bio if profile else None,
        github_url=profile.github_url if profile else None,
        portfolio_url=profile.portfolio_url if profile else None,
        availability=profile.availability if profile else None,
        hackathon_experience=profile.hackathon_experience if profile else None,
        preferred_roles=[r.role_name for r in user.preferred_roles],
        domains=[d.domain for d in user.domains],
        skills=[
            UserSkillOut(
                skill_id=s.skill_id,
                name=s.skill.name,
                category=s.skill.category,
                proficiency=s.proficiency,
            )
            for s in user.skills
        ],
        previous_projects=[PreviousProjectOut.model_validate(p) for p in user.previous_projects],
        completion_percent=percent,
        missing_fields=missing,
    )


def serialize_hackathon(h: Hackathon) -> HackathonOut:
    return HackathonOut(
        id=h.id,
        name=h.name,
        slug=h.slug,
        description=h.description,
        short_description=h.short_description,
        banner_url=h.banner_url,
        organizer=h.organizer,
        start_date=h.start_date,
        end_date=h.end_date,
        registration_deadline=h.registration_deadline,
        location=h.location,
        team_size_min=h.team_size_min,
        team_size_max=h.team_size_max,
        rules=h.rules,
        status=h.status,
        domains=[d.domain for d in h.domains],
        criteria=[CriterionOut.model_validate(c) for c in h.criteria],
        problem_count=len(h.problems),
        team_count=len(h.teams),
        created_at=h.created_at,
    )


def serialize_hackathon_list(h: Hackathon) -> HackathonListItem:
    return HackathonListItem(
        id=h.id,
        name=h.name,
        slug=h.slug,
        short_description=h.short_description,
        banner_url=h.banner_url,
        organizer=h.organizer,
        start_date=h.start_date,
        end_date=h.end_date,
        registration_deadline=h.registration_deadline,
        location=h.location,
        team_size_min=h.team_size_min,
        team_size_max=h.team_size_max,
        status=h.status,
        domains=[d.domain for d in h.domains],
        problem_count=len([p for p in h.problems if p.is_published]),
        team_count=len(h.teams),
    )


def serialize_problem(p) -> ProblemOut:
    return ProblemOut.model_validate(p)


def serialize_problem_summary(p) -> ProblemSummary:
    return ProblemSummary.model_validate(p)


def serialize_team(team: Team, current_user_id) -> TeamOut:
    members = []
    active_count = 0
    for m in team.members:
        if m.status == MemberStatus.left:
            continue
        if m.status == MemberStatus.active:
            active_count += 1
        user = m.user
        members.append(
            MemberOut(
                id=m.id,
                user_id=user.id,
                full_name=user.full_name,
                email=user.email,
                member_role=m.member_role,
                status=m.status,
                college=user.college,
                skills=[
                    UserSkillOut(
                        skill_id=s.skill_id,
                        name=s.skill.name,
                        category=s.skill.category,
                        proficiency=s.proficiency,
                    )
                    for s in user.skills
                ],
                preferred_roles=[r.role_name for r in user.preferred_roles],
                availability=user.profile.availability.value if user.profile and user.profile.availability else None,
            )
        )
    selected = None
    if team.problem_selection:
        p = team.problem_selection.problem
        selected = SelectedProblemOut(
            id=p.id,
            code=p.code,
            title=p.title,
            domain=p.domain,
            description=p.description,
            selected_at=team.problem_selection.selected_at,
        )
    min_size = team.hackathon.team_size_min if team.hackathon else 2
    max_size = team.hackathon.team_size_max if team.hackathon else 4
    return TeamOut(
        id=team.id,
        name=team.name,
        invite_code=team.invite_code,
        hackathon_id=team.hackathon_id,
        hackathon_name=team.hackathon.name if team.hackathon else "",
        leader_id=team.leader_id,
        leader_name=team.leader.full_name if team.leader else "",
        members=members,
        selected_problem=selected,
        created_at=team.created_at,
        is_leader=team.leader_id == current_user_id,
        active_member_count=active_count,
        team_size_min=min_size,
        team_size_max=max_size,
        is_ready=active_count >= min_size,
        is_full=active_count >= max_size,
    )
