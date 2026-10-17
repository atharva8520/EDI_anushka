from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.hackathon import Hackathon, HackathonProblem, HackathonStatus
from app.models.team import MemberStatus, Team, TeamMember, TeamProblemSelection
from app.models.user import User, UserRole
from app.schemas.dashboard import (
    ActiveHackathonPanel,
    AdminStats,
    Insight,
    NextAction,
    StudentDashboard,
)
from app.services.profile_service import profile_completion


def student_dashboard(db: Session, user: User) -> StudentDashboard:
    user = db.scalar(
        select(User)
        .options(
            selectinload(User.profile),
            selectinload(User.skills),
            selectinload(User.preferred_roles),
            selectinload(User.domains),
            selectinload(User.previous_projects),
            selectinload(User.memberships).selectinload(TeamMember.team).selectinload(Team.hackathon),
            selectinload(User.memberships)
            .selectinload(TeamMember.team)
            .selectinload(Team.problem_selection)
            .selectinload(TeamProblemSelection.problem),
            selectinload(User.memberships).selectinload(TeamMember.team).selectinload(Team.members),
        )
        .where(User.id == user.id)
    )
    assert user is not None
    completion, missing = profile_completion(user)

    membership = next((m for m in user.memberships if m.status == MemberStatus.active), None)
    active = None
    problem_title = None
    if membership:
        team = membership.team
        problem_title = team.problem_selection.problem.title if team.problem_selection else None
        active = ActiveHackathonPanel(
            hackathon_id=str(team.hackathon_id),
            hackathon_name=team.hackathon.name,
            status=team.hackathon.status.value,
            deadline=str(team.hackathon.end_date),
            team_name=team.name,
            problem_title=problem_title,
            member_count=len([m for m in team.members if m.status == MemberStatus.active]),
            progress= _progress(completion, bool(team.problem_selection), len(team.members)),
        )

    insights = [
        Insight(
            key="profile",
            label="Profile",
            status="ready" if completion >= 80 else "incomplete",
            detail=f"{completion}% complete" + (f" · missing {', '.join(missing[:3])}" if missing else ""),
        ),
        Insight(
            key="team",
            label="Team",
            status="ready" if membership else "incomplete",
            detail=membership.team.name if membership else "You have not joined a team yet",
        ),
        Insight(
            key="problem",
            label="Problem",
            status="ready" if problem_title else "incomplete",
            detail=problem_title or "Select a problem statement with your team",
        ),
        Insight(
            key="compatibility",
            label="Team compatibility",
            status="upcoming",
            detail="AI teammate matching arrives in Part 2",
        ),
    ]

    next_action = _next_action(completion, membership, problem_title)
    return StudentDashboard(
        greeting_name=user.full_name.split()[0],
        profile_completion=completion,
        active=active,
        insights=insights,
        next_action=next_action,
    )


def _progress(profile: int, has_problem: bool, members: int) -> int:
    score = profile * 0.35
    score += 35 if has_problem else 0
    score += 30 if members >= 2 else 10
    return min(int(score), 100)


def _next_action(completion: int, membership: TeamMember | None, problem_title: str | None) -> NextAction:
    if completion < 70:
        return NextAction(
            title="Complete your builder profile",
            description="Team matching and capability maps use your skills, roles, and availability. Finish the missing sections first.",
            cta="Complete profile",
            href="/app/profile",
        )
    if membership is None:
        return NextAction(
            title="Join a published hackathon",
            description="Browse live events, pick a challenge, then create or join a team.",
            cta="Explore hackathons",
            href="/app/hackathons",
        )
    if not problem_title:
        return NextAction(
            title="Select a problem statement",
            description=f"{membership.team.name} is formed. Lock a problem so later AI analysis has a real target.",
            cta="View hackathon",
            href=f"/app/hackathons/{membership.team.hackathon_id}",
        )
    return NextAction(
        title="Grow a complementary team",
        description="Invite teammates or share your invite code. AI compatibility scoring ships in Part 2 of HackNova.",
        cta="Open team workspace",
        href="/app/team",
    )


def admin_stats(db: Session) -> AdminStats:
    total = db.scalar(select(func.count(Hackathon.id))) or 0
    active = db.scalar(select(func.count(Hackathon.id)).where(Hackathon.status == HackathonStatus.active)) or 0
    published = db.scalar(
        select(func.count(Hackathon.id)).where(Hackathon.status.in_([HackathonStatus.published, HackathonStatus.active]))
    ) or 0
    participants = db.scalar(select(func.count(User.id)).where(User.role == UserRole.student)) or 0
    teams = db.scalar(select(func.count(Team.id))) or 0
    problems = db.scalar(select(func.count(HackathonProblem.id))) or 0
    return AdminStats(
        total_hackathons=total,
        active_hackathons=active,
        published_hackathons=published,
        participants=participants,
        teams=teams,
        problems=problems,
    )
