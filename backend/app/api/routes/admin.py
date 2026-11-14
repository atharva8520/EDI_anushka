"""Admin endpoints for managing hackathons, teams, participants, and system activity."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import require_admin
from app.database.session import get_db
from app.models.hackathon import Hackathon, HackathonProblem
from app.models.project import ChecklistItem, Project, Task, TaskStatus
from app.models.team import MemberStatus, Team, TeamMember, TeamProblemSelection
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminActivityDay,
    AdminActivityOut,
    AdminHackathonActivity,
    AdminParticipantOut,
    AdminProjectSummaryOut,
    AdminSelectedProblemOut,
    AdminTeamDetailOut,
    AdminTeamListItem,
    AdminTeamMemberOut,
)
from app.services.query_helpers import escape_like

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/teams", response_model=list[AdminTeamListItem])
def admin_teams(
    response: Response,
    hackathon_id: UUID | None = None,
    q: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AdminTeamListItem]:
    """List teams with search, filtering, pagination, and progress metrics. Computed via grouped queries."""
    stmt = select(Team)
    if hackathon_id is not None:
        stmt = stmt.where(Team.hackathon_id == hackathon_id)
    if q and q.strip():
        escaped = escape_like(q.strip())
        stmt = stmt.where(Team.name.ilike(f"%{escaped}%", escape="\\"))

    # Total matching count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = db.scalar(count_stmt) or 0
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    # Paginated query
    paged_stmt = (
        stmt.options(selectinload(Team.hackathon), selectinload(Team.leader))
        .order_by(Team.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    teams = db.scalars(paged_stmt).all()
    if not teams:
        return []

    team_ids = [t.id for t in teams]

    # 1. Grouped active member count
    member_counts_q = (
        select(TeamMember.team_id, func.count(TeamMember.id))
        .where(TeamMember.team_id.in_(team_ids), TeamMember.status == MemberStatus.active)
        .group_by(TeamMember.team_id)
    )
    member_counts = dict(db.execute(member_counts_q).all())

    # 2. Selected problem title
    problem_q = (
        select(TeamProblemSelection.team_id, HackathonProblem.title)
        .join(HackathonProblem, TeamProblemSelection.problem_id == HackathonProblem.id)
        .where(TeamProblemSelection.team_id.in_(team_ids))
    )
    problem_titles = dict(db.execute(problem_q).all())

    # 3. Project existence & task stats
    proj_q = select(Project.id, Project.team_id).where(Project.team_id.in_(team_ids))
    team_projects = dict((team_id, proj_id) for proj_id, team_id in db.execute(proj_q).all())

    task_stats: dict[UUID, tuple[int, int]] = {}
    if team_projects:
        proj_ids = list(team_projects.values())
        task_q = (
            select(
                Task.project_id,
                func.count(Task.id),
                func.count(case((Task.status == TaskStatus.completed, 1))),
            )
            .where(Task.project_id.in_(proj_ids))
            .group_by(Task.project_id)
        )
        for proj_id, t_total, t_completed in db.execute(task_q).all():
            task_stats[proj_id] = (t_total, t_completed)

    result: list[AdminTeamListItem] = []
    for t in teams:
        m_count = member_counts.get(t.id, 0)
        h_min = t.hackathon.team_size_min if t.hackathon else 2
        h_max = t.hackathon.team_size_max if t.hackathon else 4
        is_ready = m_count >= h_min

        p_id = team_projects.get(t.id)
        has_proj = p_id is not None
        t_total, t_comp = task_stats.get(p_id, (0, 0)) if has_proj else (0, 0)
        pct = int((t_comp / t_total) * 100) if t_total > 0 else 0

        result.append(
            AdminTeamListItem(
                id=t.id,
                name=t.name,
                hackathon_id=t.hackathon_id,
                hackathon_name=t.hackathon.name if t.hackathon else "",
                leader_name=t.leader.full_name if t.leader else "",
                member_count=m_count,
                team_size_min=h_min,
                team_size_max=h_max,
                is_ready=is_ready,
                selected_problem_title=problem_titles.get(t.id),
                has_project=has_proj,
                tasks_total=t_total,
                tasks_completed=t_comp,
                percent_complete=pct,
                created_at=t.created_at,
            )
        )

    return result


@router.get("/teams/{team_id}", response_model=AdminTeamDetailOut)
def admin_team_detail(
    team_id: UUID,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminTeamDetailOut:
    """Get detailed read-only view of a team including active members, selected problem, and project metrics. No emails."""
    team = db.scalar(
        select(Team)
        .options(
            selectinload(Team.hackathon),
            selectinload(Team.leader),
            selectinload(Team.members).selectinload(TeamMember.user),
            selectinload(Team.problem_selection).selectinload(TeamProblemSelection.problem),
            selectinload(Team.project).selectinload(Project.tasks),
            selectinload(Team.project).selectinload(Project.checklist_items),
        )
        .where(Team.id == team_id)
    )
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Only ACTIVE members, with is_leader, NO emails
    active_members = [m for m in team.members if m.status == MemberStatus.active]
    members_out: list[AdminTeamMemberOut] = []
    for m in active_members:
        members_out.append(
            AdminTeamMemberOut(
                id=m.user_id,
                name=m.user.full_name,
                college=m.user.college,
                member_role=m.member_role,
                joined_at=m.joined_at,
                is_leader=m.user_id == team.leader_id,
            )
        )

    # Selected problem
    selected_problem = None
    if team.problem_selection and team.problem_selection.problem:
        prob = team.problem_selection.problem
        selected_problem = AdminSelectedProblemOut(
            id=prob.id,
            code=prob.code,
            title=prob.title,
            domain=prob.domain,
        )

    # Project summary
    project_summary = None
    if team.project:
        proj = team.project
        tasks = proj.tasks or []
        t_todo = sum(1 for t in tasks if t.status == TaskStatus.todo)
        t_prog = sum(1 for t in tasks if t.status == TaskStatus.in_progress)
        t_rev = sum(1 for t in tasks if t.status == TaskStatus.review)
        t_comp = sum(1 for t in tasks if t.status == TaskStatus.completed)
        t_total = len(tasks)
        pct_comp = int((t_comp / t_total) * 100) if t_total > 0 else 0

        c_items = proj.checklist_items or []
        c_done = sum(1 for c in c_items if c.is_done)
        c_total = len(c_items)
        c_pct = int((c_done / c_total) * 100) if c_total > 0 else 0

        project_summary = AdminProjectSummaryOut(
            task_counts={
                "todo": t_todo,
                "in_progress": t_prog,
                "review": t_rev,
                "completed": t_comp,
            },
            percent_complete=pct_comp,
            checklist_percent=c_pct,
        )

    return AdminTeamDetailOut(
        id=team.id,
        name=team.name,
        hackathon_id=team.hackathon_id,
        hackathon_name=team.hackathon.name if team.hackathon else "",
        leader_name=team.leader.full_name if team.leader else "",
        created_at=team.created_at,
        members=members_out,
        selected_problem=selected_problem,
        project_summary=project_summary,
    )


@router.get("/participants", response_model=list[AdminParticipantOut])
def admin_participants(
    response: Response,
    q: str | None = None,
    college: str | None = None,
    has_team: bool | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AdminParticipantOut]:
    """List participants with filters (q, college, has_team active membership) and pagination."""
    stmt = select(User).where(User.role == UserRole.student)

    if q and q.strip():
        escaped = escape_like(q.strip())
        stmt = stmt.where(
            or_(
                User.full_name.ilike(f"%{escaped}%", escape="\\"),
                User.email.ilike(f"%{escaped}%", escape="\\"),
            )
        )

    if college and college.strip():
        escaped_col = escape_like(college.strip())
        stmt = stmt.where(User.college.ilike(f"%{escaped_col}%", escape="\\"))

    if has_team is not None:
        active_subq = select(1).where(
            TeamMember.user_id == User.id,
            TeamMember.status == MemberStatus.active,
        ).exists()
        if has_team:
            stmt = stmt.where(active_subq)
        else:
            stmt = stmt.where(~active_subq)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = db.scalar(count_stmt) or 0
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    # Paginated users
    paged_stmt = (
        stmt.options(selectinload(User.memberships).selectinload(TeamMember.team))
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    users = db.scalars(paged_stmt).all()

    result: list[AdminParticipantOut] = []
    for u in users:
        active_membership = next((m for m in u.memberships if m.status == MemberStatus.active), None)
        team_name = active_membership.team.name if active_membership and active_membership.team else None
        result.append(
            AdminParticipantOut(
                id=str(u.id),
                full_name=u.full_name,
                email=u.email,
                college=u.college,
                branch=u.branch,
                year=u.year,
                team_name=team_name,
            )
        )

    return result


@router.get("/activity", response_model=AdminActivityOut)
def admin_activity(
    days: int = Query(default=30, ge=1, le=90),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminActivityOut:
    """
    Get zero-filled daily activity series and per-hackathon metrics.
    
    The tasks_completed daily series counts tasks that are currently completed with completed_at in the date range.
    """
    now = datetime.now(timezone.utc)
    today = now.date()
    start_date = today - timedelta(days=days - 1)
    start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)

    # Initialize zero-filled map
    daily_map: dict[str, dict[str, int]] = {}
    for d in range(days):
        day_date = start_date + timedelta(days=d)
        iso = day_date.isoformat()
        daily_map[iso] = {"new_students": 0, "new_teams": 0, "tasks_completed": 0}

    # 1. New students grouped by date
    student_q = (
        select(func.date(User.created_at).label("day"), func.count(User.id))
        .where(User.role == UserRole.student, User.created_at >= start_dt)
        .group_by(func.date(User.created_at))
    )
    for day_val, count in db.execute(student_q).all():
        day_str = str(day_val)
        if day_str in daily_map:
            daily_map[day_str]["new_students"] = count

    # 2. New teams grouped by date
    team_q = (
        select(func.date(Team.created_at).label("day"), func.count(Team.id))
        .where(Team.created_at >= start_dt)
        .group_by(func.date(Team.created_at))
    )
    for day_val, count in db.execute(team_q).all():
        day_str = str(day_val)
        if day_str in daily_map:
            daily_map[day_str]["new_teams"] = count

    # 3. Tasks completed grouped by date (currently completed with completed_at in range)
    task_q = (
        select(func.date(Task.completed_at).label("day"), func.count(Task.id))
        .where(
            Task.status == TaskStatus.completed,
            Task.completed_at.is_not(None),
            Task.completed_at >= start_dt,
        )
        .group_by(func.date(Task.completed_at))
    )
    for day_val, count in db.execute(task_q).all():
        day_str = str(day_val)
        if day_str in daily_map:
            daily_map[day_str]["tasks_completed"] = count

    series = [
        AdminActivityDay(
            date=iso,
            new_students=counts["new_students"],
            new_teams=counts["new_teams"],
            tasks_completed=counts["tasks_completed"],
        )
        for iso, counts in sorted(daily_map.items())
    ]

    # Per-hackathon metrics (grouped)
    hackathons = db.scalars(
        select(Hackathon).options(selectinload(Hackathon.teams).selectinload(Team.members)).order_by(Hackathon.start_date.desc())
    ).all()

    h_metrics: list[AdminHackathonActivity] = []
    if hackathons:
        h_ids = [h.id for h in hackathons]

        # Distinct participant count per hackathon
        p_count_q = (
            select(Team.hackathon_id, func.count(func.distinct(TeamMember.user_id)))
            .join(TeamMember, Team.id == TeamMember.team_id)
            .where(Team.hackathon_id.in_(h_ids), TeamMember.status == MemberStatus.active)
            .group_by(Team.hackathon_id)
        )
        p_counts = dict(db.execute(p_count_q).all())

        # Teams with problem selection
        prob_team_q = (
            select(Team.hackathon_id, func.count(TeamProblemSelection.team_id))
            .join(Team, TeamProblemSelection.team_id == Team.id)
            .where(Team.hackathon_id.in_(h_ids))
            .group_by(Team.hackathon_id)
        )
        prob_team_counts = dict(db.execute(prob_team_q).all())

        # Teams with project
        proj_team_q = (
            select(Team.hackathon_id, func.count(Project.id))
            .join(Team, Project.team_id == Team.id)
            .where(Team.hackathon_id.in_(h_ids))
            .group_by(Team.hackathon_id)
        )
        proj_team_counts = dict(db.execute(proj_team_q).all())

        # Tasks total & completed per hackathon
        task_h_q = (
            select(
                Team.hackathon_id,
                func.count(Task.id),
                func.count(case((Task.status == TaskStatus.completed, 1))),
            )
            .join(Project, Team.id == Project.team_id)
            .join(Task, Project.id == Task.project_id)
            .where(Team.hackathon_id.in_(h_ids))
            .group_by(Team.hackathon_id)
        )
        task_h_stats: dict[UUID, tuple[int, int]] = {}
        for h_id, t_tot, t_comp in db.execute(task_h_q).all():
            task_h_stats[h_id] = (t_tot, t_comp)

        for h in hackathons:
            t_count = len(h.teams)
            ready_count = 0
            for t in h.teams:
                active_count = len([m for m in t.members if m.status == MemberStatus.active])
                if active_count >= h.team_size_min:
                    ready_count += 1

            tasks_tot, tasks_comp = task_h_stats.get(h.id, (0, 0))

            h_metrics.append(
                AdminHackathonActivity(
                    id=h.id,
                    name=h.name,
                    status=h.status.value,
                    team_count=t_count,
                    participant_count=p_counts.get(h.id, 0),
                    ready_team_count=ready_count,
                    teams_with_problem=prob_team_counts.get(h.id, 0),
                    teams_with_project=proj_team_counts.get(h.id, 0),
                    tasks_total=tasks_tot,
                    tasks_completed=tasks_comp,
                )
            )

    return AdminActivityOut(
        days=days,
        series=series,
        hackathons=h_metrics,
    )
