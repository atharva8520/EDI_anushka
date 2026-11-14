from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.hackathon import HackathonProblem
from app.models.project import ActivityLog, ChecklistItem, Milestone, Project, ProjectNote, Task, TaskPriority, TaskStatus
from app.models.team import MemberStatus, Team, TeamMember, TeamProblemSelection
from app.models.user import User, UserRole
from app.schemas.project import (
    ActivityLogOut,
    ChecklistItemCreate,
    ChecklistItemOut,
    ChecklistItemUpdate,
    MemberWorkload,
    MilestoneCreate,
    MilestoneOut,
    MilestoneProgress,
    MilestoneUpdate,
    NoteCreate,
    NoteOut,
    NoteUpdate,
    ProjectCreate,
    ProjectOut,
    ProjectSummaryOut,
    ProjectUpdate,
    TaskCreate,
    TaskMove,
    TaskOut,
    TaskUpdate,
)
from app.services.project_service import check_project_access, log_activity, move_task, reindex_column_positions

router = APIRouter(tags=["projects"])

PROJECT_LOAD = (
    selectinload(Project.team).selectinload(Team.members).selectinload(TeamMember.user),
    selectinload(Project.team).selectinload(Team.problem_selection).selectinload(TeamProblemSelection.problem),
    selectinload(Project.milestones),
    selectinload(Project.tasks).selectinload(Task.assignee),
    selectinload(Project.tasks).selectinload(Task.creator),
    selectinload(Project.tasks).selectinload(Task.milestone),
    selectinload(Project.notes).selectinload(ProjectNote.creator),
    selectinload(Project.notes).selectinload(ProjectNote.updater),
    selectinload(Project.checklist_items).selectinload(ChecklistItem.assignee),
    selectinload(Project.checklist_items).selectinload(ChecklistItem.creator),
)


def _load_project(db: Session, project_id: UUID) -> Project:
    project = db.scalar(select(Project).options(*PROJECT_LOAD).where(Project.id == project_id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _serialize_project(project: Project) -> ProjectOut:
    problem_title = (
        project.team.problem_selection.problem.title
        if project.team.problem_selection and project.team.problem_selection.problem
        else None
    )
    return ProjectOut(
        id=project.id,
        team_id=project.team_id,
        title=project.title,
        summary=project.summary,
        repo_url=project.repo_url,
        created_by=project.created_by,
        created_at=project.created_at,
        updated_at=project.updated_at,
        team_name=project.team.name,
        problem_title=problem_title,
    )


def _serialize_note(n: ProjectNote) -> NoteOut:
    return NoteOut(
        id=n.id,
        project_id=n.project_id,
        title=n.title,
        body=n.body,
        created_by=n.created_by,
        creator_name=n.creator.full_name if n.creator else None,
        updated_by=n.updated_by,
        updater_name=n.updater.full_name if n.updater else None,
        created_at=n.created_at,
        updated_at=n.updated_at,
    )


def _serialize_checklist_item(item: ChecklistItem) -> ChecklistItemOut:
    return ChecklistItemOut(
        id=item.id,
        project_id=item.project_id,
        title=item.title,
        is_done=item.is_done,
        assignee_id=item.assignee_id,
        assignee_name=item.assignee.full_name if item.assignee else None,
        url=item.url,
        position=item.position,
        completed_at=item.completed_at,
        created_by=item.created_by,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _serialize_task(task: Task) -> TaskOut:
    return TaskOut(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        status=task.status,
        assignee_id=task.assignee_id,
        assignee_name=task.assignee.full_name if task.assignee else None,
        created_by=task.created_by,
        creator_name=task.creator.full_name if task.creator else None,
        milestone_id=task.milestone_id,
        milestone_title=task.milestone.title if task.milestone else None,
        due_date=task.due_date,
        position=task.position,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _serialize_milestone(m: Milestone) -> MilestoneOut:
    tasks = m.tasks or []
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.completed)
    return MilestoneOut(
        id=m.id,
        project_id=m.project_id,
        title=m.title,
        description=m.description,
        due_date=m.due_date,
        created_at=m.created_at,
        task_count=total,
        completed_task_count=completed,
    )


# --- 1. Project Management ---

@router.post("/teams/{team_id}/project", response_model=ProjectOut, status_code=201)
def create_project(
    team_id: UUID,
    payload: ProjectCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = db.scalar(
        select(Team)
        .options(
            selectinload(Team.members),
            selectinload(Team.problem_selection).selectinload(TeamProblemSelection.problem),
            selectinload(Team.project),
        )
        .where(Team.id == team_id)
    )
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.leader_id != user.id:
        raise HTTPException(status_code=403, detail="Only the team leader can create a project")

    if not team.problem_selection or not team.problem_selection.problem:
        raise HTTPException(status_code=400, detail="Team must select a problem before creating a project")

    if team.project:
        raise HTTPException(status_code=409, detail="A project already exists for this team")

    problem = team.problem_selection.problem
    default_title = f"{team.name} - {problem.title}"
    title = payload.title.strip() if payload.title and payload.title.strip() else default_title

    project = Project(
        team_id=team.id,
        title=title,
        summary=payload.summary,
        created_by=user.id,
    )
    db.add(project)
    db.flush()

    log_activity(
        db=db,
        project_id=project.id,
        actor_id=user.id,
        action="project_created",
        entity_type="project",
        entity_id=project.id,
        details={"project_title": project.title, "actor_name": user.full_name},
    )

    db.commit()
    return _serialize_project(_load_project(db, project.id))


@router.get("/projects/mine", response_model=ProjectOut | None)
def my_project(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = db.scalar(
        select(TeamMember).where(TeamMember.user_id == user.id, TeamMember.status == MemberStatus.active)
    )
    if not membership:
        return None

    project = db.scalar(
        select(Project)
        .options(*PROJECT_LOAD)
        .where(Project.team_id == membership.team_id)
    )
    if not project:
        return None

    check_project_access(project, user, write=False)
    return _serialize_project(project)


@router.get("/projects/{id}", response_model=ProjectOut)
def get_project(
    id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    check_project_access(project, user, write=False)
    return _serialize_project(project)


@router.patch("/projects/{id}", response_model=ProjectOut)
def update_project(
    id: UUID,
    payload: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    team, is_leader = check_project_access(project, user, write=True)

    sent_fields = payload.model_dump(exclude_unset=True)
    if not sent_fields:
        return _serialize_project(project)

    changes = {}

    if "title" in sent_fields:
        new_title = payload.title
        if new_title != project.title:
            if not is_leader:
                raise HTTPException(status_code=403, detail="Only the team leader can change the project title")
            changes["title"] = {"from": project.title, "to": new_title}
            project.title = new_title

    if "summary" in sent_fields:
        changes["summary"] = {"from": project.summary, "to": payload.summary}
        project.summary = payload.summary

    if "repo_url" in sent_fields:
        changes["repo_url"] = {"from": project.repo_url, "to": payload.repo_url}
        project.repo_url = payload.repo_url

    if changes:
        log_activity(
            db=db,
            project_id=project.id,
            actor_id=user.id,
            action="project_updated",
            entity_type="project",
            entity_id=project.id,
            details={"changes": list(changes.keys()), "actor_name": user.full_name},
        )
        db.commit()
        db.refresh(project)

    return _serialize_project(project)


# --- 2. Tasks CRUD & Move ---

@router.get("/projects/{id}/tasks", response_model=list[TaskOut])
def list_tasks(
    id: UUID,
    status: TaskStatus | None = None,
    assignee_id: UUID | None = None,
    priority: TaskPriority | None = None,
    q: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    check_project_access(project, user, write=False)

    stmt = (
        select(Task)
        .options(selectinload(Task.assignee), selectinload(Task.creator), selectinload(Task.milestone))
        .where(Task.project_id == project.id)
    )
    if status is not None:
        stmt = stmt.where(Task.status == status)
    if assignee_id is not None:
        stmt = stmt.where(Task.assignee_id == assignee_id)
    if priority is not None:
        stmt = stmt.where(Task.priority == priority)
    if q and q.strip():
        stmt = stmt.where(Task.title.ilike(f"%{q.strip()}%"))

    stmt = stmt.order_by(Task.status.asc(), Task.position.asc())
    tasks = db.scalars(stmt).all()
    return [_serialize_task(t) for t in tasks]


@router.post("/projects/{id}/tasks", response_model=TaskOut, status_code=201)
def create_task(
    id: UUID,
    payload: TaskCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    team, _ = check_project_access(project, user, write=True)

    # Validate assignee is an active team member
    if payload.assignee_id:
        is_active_member = any(
            m.user_id == payload.assignee_id and m.status == MemberStatus.active for m in team.members
        )
        if not is_active_member:
            raise HTTPException(status_code=400, detail="Assignee must be an active member of the team")

    # Validate milestone belongs to this project
    if payload.milestone_id:
        milestone = db.get(Milestone, payload.milestone_id)
        if not milestone or milestone.project_id != project.id:
            raise HTTPException(status_code=400, detail="Milestone does not belong to this project")

    # Determine position at end of status column
    current_count = sum(1 for t in project.tasks if t.status == payload.status)

    task = Task(
        project_id=project.id,
        title=payload.title.strip(),
        description=payload.description,
        priority=payload.priority,
        status=payload.status,
        assignee_id=payload.assignee_id,
        created_by=user.id,
        milestone_id=payload.milestone_id,
        due_date=payload.due_date,
        position=current_count,
    )
    db.add(task)
    db.flush()

    log_activity(
        db=db,
        project_id=project.id,
        actor_id=user.id,
        action="task_created",
        entity_type="task",
        entity_id=task.id,
        details={
            "task_title": task.title,
            "status": task.status.value,
            "priority": task.priority.value,
            "actor_name": user.full_name,
        },
    )

    db.commit()
    db.refresh(task)
    return _serialize_task(task)


@router.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(
    task_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.scalar(
        select(Task)
        .options(
            selectinload(Task.project).selectinload(Project.team).selectinload(Team.members),
            selectinload(Task.assignee),
            selectinload(Task.creator),
            selectinload(Task.milestone),
        )
        .where(Task.id == task_id)
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    check_project_access(task.project, user, write=False)
    return _serialize_task(task)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.scalar(
        select(Task)
        .options(
            selectinload(Task.project).selectinload(Project.team).selectinload(Team.members),
            selectinload(Task.assignee),
            selectinload(Task.creator),
            selectinload(Task.milestone),
        )
        .where(Task.id == task_id)
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    team, _ = check_project_access(task.project, user, write=True)

    changed_fields = []
    data = payload.model_dump(exclude_unset=True)

    if "assignee_id" in data:
        new_assignee_id = data["assignee_id"]
        if new_assignee_id is not None:
            is_active_member = any(
                m.user_id == new_assignee_id and m.status == MemberStatus.active for m in team.members
            )
            if not is_active_member:
                raise HTTPException(status_code=400, detail="Assignee must be an active member of the team")
        task.assignee_id = new_assignee_id
        changed_fields.append("assignee")

    if "milestone_id" in data:
        new_milestone_id = data["milestone_id"]
        if new_milestone_id is not None:
            milestone = db.get(Milestone, new_milestone_id)
            if not milestone or milestone.project_id != task.project_id:
                raise HTTPException(status_code=400, detail="Milestone does not belong to this project")
        task.milestone_id = new_milestone_id
        changed_fields.append("milestone")

    for field in ("title", "description", "priority", "due_date"):
        if field in data:
            val = data[field]
            if field == "title" and val:
                val = val.strip()
            setattr(task, field, val)
            changed_fields.append(field)

    if changed_fields:
        log_activity(
            db=db,
            project_id=task.project_id,
            actor_id=user.id,
            action="task_updated",
            entity_type="task",
            entity_id=task.id,
            details={
                "task_title": task.title,
                "changed_fields": changed_fields,
                "actor_name": user.full_name,
            },
        )

    db.commit()
    db.refresh(task)
    return _serialize_task(task)


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.scalar(
        select(Task)
        .options(
            selectinload(Task.project).selectinload(Project.team).selectinload(Team.members),
            selectinload(Task.project).selectinload(Project.tasks),
        )
        .where(Task.id == task_id)
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    team, is_leader = check_project_access(task.project, user, write=True)
    if not is_leader and task.created_by != user.id:
        raise HTTPException(status_code=403, detail="Only the team leader or task creator can delete this task")

    status = task.status
    project_id = task.project_id
    task_title = task.title

    db.delete(task)
    db.flush()

    # Reindex remaining tasks in this status column
    remaining = [t for t in task.project.tasks if t.status == status and t.id != task_id]
    remaining.sort(key=lambda x: x.position)
    reindex_column_positions(remaining)

    log_activity(
        db=db,
        project_id=project_id,
        actor_id=user.id,
        action="task_deleted",
        entity_type="task",
        entity_id=task_id,
        details={"task_title": task_title, "actor_name": user.full_name},
    )

    db.commit()
    return {"ok": True}


@router.patch("/tasks/{task_id}/move", response_model=TaskOut)
def move_task_endpoint(
    task_id: UUID,
    payload: TaskMove,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.scalar(
        select(Task)
        .options(
            selectinload(Task.project).selectinload(Project.team).selectinload(Team.members),
            selectinload(Task.project).selectinload(Project.tasks),
            selectinload(Task.assignee),
            selectinload(Task.creator),
            selectinload(Task.milestone),
        )
        .where(Task.id == task_id)
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    check_project_access(task.project, user, write=True)

    moved = move_task(
        db=db,
        task=task,
        new_status=payload.status,
        new_position=payload.position,
        user=user,
    )
    db.commit()
    db.refresh(moved)
    return _serialize_task(moved)


# --- 3. Milestones CRUD ---

@router.get("/projects/{id}/milestones", response_model=list[MilestoneOut])
def list_milestones(
    id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    check_project_access(project, user, write=False)

    milestones = db.scalars(
        select(Milestone)
        .options(selectinload(Milestone.tasks))
        .where(Milestone.project_id == project.id)
        .order_by(Milestone.due_date.asc().nulls_last(), Milestone.created_at.asc())
    ).all()
    return [_serialize_milestone(m) for m in milestones]


@router.post("/projects/{id}/milestones", response_model=MilestoneOut, status_code=201)
def create_milestone(
    id: UUID,
    payload: MilestoneCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    check_project_access(project, user, write=True)

    milestone = Milestone(
        project_id=project.id,
        title=payload.title.strip(),
        description=payload.description,
        due_date=payload.due_date,
    )
    db.add(milestone)
    db.flush()

    log_activity(
        db=db,
        project_id=project.id,
        actor_id=user.id,
        action="milestone_created",
        entity_type="milestone",
        entity_id=milestone.id,
        details={"milestone_title": milestone.title, "actor_name": user.full_name},
    )

    db.commit()
    db.refresh(milestone)
    return _serialize_milestone(milestone)


@router.patch("/milestones/{id}", response_model=MilestoneOut)
def update_milestone(
    id: UUID,
    payload: MilestoneUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    milestone = db.scalar(
        select(Milestone)
        .options(selectinload(Milestone.project).selectinload(Project.team).selectinload(Team.members), selectinload(Milestone.tasks))
        .where(Milestone.id == id)
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    check_project_access(milestone.project, user, write=True)

    data = payload.model_dump(exclude_unset=True)
    for field in ("title", "description", "due_date"):
        if field in data:
            val = data[field]
            if field == "title" and val:
                val = val.strip()
            setattr(milestone, field, val)

    log_activity(
        db=db,
        project_id=milestone.project_id,
        actor_id=user.id,
        action="milestone_updated",
        entity_type="milestone",
        entity_id=milestone.id,
        details={"milestone_title": milestone.title, "actor_name": user.full_name},
    )

    db.commit()
    db.refresh(milestone)
    return _serialize_milestone(milestone)


@router.delete("/milestones/{id}")
def delete_milestone(
    id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    milestone = db.scalar(
        select(Milestone)
        .options(
            selectinload(Milestone.project).selectinload(Project.team).selectinload(Team.members),
            selectinload(Milestone.tasks),
        )
        .where(Milestone.id == id)
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    _, is_leader = check_project_access(milestone.project, user, write=True)
    if not is_leader:
        raise HTTPException(status_code=403, detail="Only the team leader can delete milestones")

    # Unlink tasks before deleting milestone (does not delete tasks)
    for t in milestone.tasks:
        t.milestone_id = None

    project_id = milestone.project_id
    m_title = milestone.title
    db.delete(milestone)

    log_activity(
        db=db,
        project_id=project_id,
        actor_id=user.id,
        action="milestone_deleted",
        entity_type="milestone",
        entity_id=id,
        details={"milestone_title": m_title, "actor_name": user.full_name},
    )

    db.commit()
    return {"ok": True}


# --- 4. Summary & Activity ---

@router.get("/projects/{id}/summary", response_model=ProjectSummaryOut)
def get_project_summary(
    id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    team, _ = check_project_access(project, user, write=False)

    tasks = project.tasks
    total = len(tasks)
    todo = sum(1 for t in tasks if t.status == TaskStatus.todo)
    in_progress = sum(1 for t in tasks if t.status == TaskStatus.in_progress)
    review = sum(1 for t in tasks if t.status == TaskStatus.review)
    completed = sum(1 for t in tasks if t.status == TaskStatus.completed)

    percent = int((completed / total) * 100) if total > 0 else 0

    today = date.today()
    overdue = sum(1 for t in tasks if t.due_date and t.due_date < today and t.status != TaskStatus.completed)

    # Active members workload
    active_members = [m for m in team.members if m.status == MemberStatus.active]
    workload = []
    for m in active_members:
        u = m.user
        m_tasks = [t for t in tasks if t.assignee_id == u.id]
        m_completed = sum(1 for t in m_tasks if t.status == TaskStatus.completed)
        m_open = len(m_tasks) - m_completed
        workload.append(
            MemberWorkload(
                user_id=u.id,
                full_name=u.full_name,
                open_tasks=m_open,
                completed_tasks=m_completed,
            )
        )

    # Unassigned tasks count
    unassigned = sum(1 for t in tasks if t.assignee_id is None)

    # Milestone progress
    milestone_progress = []
    for m in project.milestones:
        m_tasks = [t for t in tasks if t.milestone_id == m.id]
        m_total = len(m_tasks)
        m_comp = sum(1 for t in m_tasks if t.status == TaskStatus.completed)
        m_percent = int((m_comp / m_total) * 100) if m_total > 0 else 0
        milestone_progress.append(
            MilestoneProgress(
                id=m.id,
                title=m.title,
                due_date=m.due_date,
                total_tasks=m_total,
                completed_tasks=m_comp,
                percent_complete=m_percent,
            )
        )

    checklist = project.checklist_items or []
    c_total = len(checklist)
    c_done = sum(1 for c in checklist if c.is_done)
    c_percent = int((c_done / c_total) * 100) if c_total > 0 else 0
    notes_count = len(project.notes or [])

    return ProjectSummaryOut(
        total_tasks=total,
        todo_count=todo,
        in_progress_count=in_progress,
        review_count=review,
        completed_count=completed,
        percent_complete=percent,
        overdue_count=overdue,
        unassigned_count=unassigned,
        workload=workload,
        milestone_progress=milestone_progress,
        checklist_total=c_total,
        checklist_done=c_done,
        checklist_percent=c_percent,
        notes_count=notes_count,
        repo_url=project.repo_url,
    )


@router.get("/projects/{id}/activity", response_model=list[ActivityLogOut])
def get_project_activity(
    id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    check_project_access(project, user, write=False)

    stmt = (
        select(ActivityLog)
        .options(selectinload(ActivityLog.actor))
        .where(ActivityLog.project_id == project.id)
        .order_by(ActivityLog.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    logs = db.scalars(stmt).all()

    return [
        ActivityLogOut(
            id=log.id,
            project_id=log.project_id,
            actor_id=log.actor_id,
            actor_name=log.actor.full_name if log.actor else None,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            created_at=log.created_at,
        )
        for log in logs
    ]


# --- 5. Project Notes (Module 6) ---

@router.get("/projects/{id}/notes", response_model=list[NoteOut])
def list_project_notes(
    id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    q: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    check_project_access(project, user, write=False)

    stmt = (
        select(ProjectNote)
        .options(selectinload(ProjectNote.creator), selectinload(ProjectNote.updater))
        .where(ProjectNote.project_id == project.id)
    )
    if q and q.strip():
        stmt = stmt.where(ProjectNote.title.ilike(f"%{q.strip()}%"))

    stmt = stmt.order_by(ProjectNote.created_at.desc()).offset(skip).limit(limit)
    notes = db.scalars(stmt).all()
    return [_serialize_note(n) for n in notes]


@router.post("/projects/{id}/notes", response_model=NoteOut, status_code=201)
def create_project_note(
    id: UUID,
    payload: NoteCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    check_project_access(project, user, write=True)

    note = ProjectNote(
        project_id=project.id,
        title=payload.title,
        body=payload.body,
        created_by=user.id,
        updated_by=user.id,
    )
    db.add(note)
    db.flush()

    log_activity(
        db=db,
        project_id=project.id,
        actor_id=user.id,
        action="note_created",
        entity_type="note",
        entity_id=note.id,
        details={"note_title": note.title, "actor_name": user.full_name},
    )

    db.commit()
    db.refresh(note)
    return _serialize_note(note)


@router.get("/notes/{note_id}", response_model=NoteOut)
def get_note(
    note_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.scalar(
        select(ProjectNote)
        .options(
            selectinload(ProjectNote.project).selectinload(Project.team).selectinload(Team.members),
            selectinload(ProjectNote.creator),
            selectinload(ProjectNote.updater),
        )
        .where(ProjectNote.id == note_id)
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    check_project_access(note.project, user, write=False)
    return _serialize_note(note)


@router.patch("/notes/{note_id}", response_model=NoteOut)
def update_note(
    note_id: UUID,
    payload: NoteUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.scalar(
        select(ProjectNote)
        .options(
            selectinload(ProjectNote.project).selectinload(Project.team).selectinload(Team.members),
            selectinload(ProjectNote.creator),
            selectinload(ProjectNote.updater),
        )
        .where(ProjectNote.id == note_id)
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    check_project_access(note.project, user, write=True)

    sent_fields = payload.model_dump(exclude_unset=True)
    if "title" in sent_fields:
        note.title = payload.title
    if "body" in sent_fields:
        note.body = payload.body

    note.updated_by = user.id

    log_activity(
        db=db,
        project_id=note.project_id,
        actor_id=user.id,
        action="note_updated",
        entity_type="note",
        entity_id=note.id,
        details={"note_title": note.title, "actor_name": user.full_name},
    )

    db.commit()
    db.refresh(note)
    return _serialize_note(note)


@router.delete("/notes/{note_id}")
def delete_note(
    note_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.scalar(
        select(ProjectNote)
        .options(selectinload(ProjectNote.project).selectinload(Project.team).selectinload(Team.members))
        .where(ProjectNote.id == note_id)
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    team, is_leader = check_project_access(note.project, user, write=True)
    if not (is_leader or note.created_by == user.id):
        raise HTTPException(status_code=403, detail="Only the author or team leader can delete this note")

    project_id = note.project_id
    note_title = note.title
    db.delete(note)

    log_activity(
        db=db,
        project_id=project_id,
        actor_id=user.id,
        action="note_deleted",
        entity_type="note",
        entity_id=note_id,
        details={"note_title": note_title, "actor_name": user.full_name},
    )

    db.commit()
    return {"ok": True}


# --- 6. Checklist Items (Module 6) ---

@router.get("/projects/{id}/checklist", response_model=list[ChecklistItemOut])
def list_checklist_items(
    id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    check_project_access(project, user, write=False)

    stmt = (
        select(ChecklistItem)
        .options(selectinload(ChecklistItem.assignee), selectinload(ChecklistItem.creator))
        .where(ChecklistItem.project_id == project.id)
        .order_by(ChecklistItem.position.asc(), ChecklistItem.created_at.asc())
    )
    items = db.scalars(stmt).all()
    return [_serialize_checklist_item(it) for it in items]


@router.post("/projects/{id}/checklist", response_model=ChecklistItemOut, status_code=201)
def create_checklist_item(
    id: UUID,
    payload: ChecklistItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    team, _ = check_project_access(project, user, write=True)

    if payload.assignee_id:
        is_active = any(m.user_id == payload.assignee_id and m.status == MemberStatus.active for m in team.members)
        if not is_active:
            raise HTTPException(status_code=400, detail="Assignee must be an active member of the team")

    max_pos = db.scalar(select(func.max(ChecklistItem.position)).where(ChecklistItem.project_id == project.id))
    position = 0 if max_pos is None else max_pos + 1

    item = ChecklistItem(
        project_id=project.id,
        title=payload.title,
        is_done=False,
        assignee_id=payload.assignee_id,
        url=payload.url,
        position=position,
        created_by=user.id,
    )
    db.add(item)
    db.flush()

    log_activity(
        db=db,
        project_id=project.id,
        actor_id=user.id,
        action="checklist_item_created",
        entity_type="checklist_item",
        entity_id=item.id,
        details={"item_title": item.title, "actor_name": user.full_name},
    )

    db.commit()
    db.refresh(item)
    return _serialize_checklist_item(item)


@router.post("/projects/{id}/checklist/defaults", response_model=list[ChecklistItemOut], status_code=201)
def create_default_checklist(
    id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _load_project(db, id)
    check_project_access(project, user, write=True)

    existing_count = db.scalar(select(func.count(ChecklistItem.id)).where(ChecklistItem.project_id == project.id))
    if existing_count > 0:
        raise HTTPException(status_code=409, detail="Project already has checklist items")

    default_titles = [
        "README with setup steps",
        "Demo video recorded",
        "Repository link added and public",
        "Presentation deck ready",
        "Deployed link or demo environment",
        "Problem requirements mapped",
        "Team roles and contributions listed",
        "Final submission completed",
    ]

    items = []
    for idx, title in enumerate(default_titles):
        it = ChecklistItem(
            project_id=project.id,
            title=title,
            is_done=False,
            assignee_id=None,
            url=None,
            position=idx,
            created_by=user.id,
        )
        db.add(it)
        items.append(it)

    db.flush()

    for it in items:
        log_activity(
            db=db,
            project_id=project.id,
            actor_id=user.id,
            action="checklist_item_created",
            entity_type="checklist_item",
            entity_id=it.id,
            details={"item_title": it.title, "actor_name": user.full_name},
        )

    db.commit()

    # Query with options for clean serialization
    stmt = (
        select(ChecklistItem)
        .options(selectinload(ChecklistItem.assignee), selectinload(ChecklistItem.creator))
        .where(ChecklistItem.project_id == project.id)
        .order_by(ChecklistItem.position.asc())
    )
    saved_items = db.scalars(stmt).all()
    return [_serialize_checklist_item(it) for it in saved_items]


@router.patch("/checklist/{item_id}", response_model=ChecklistItemOut)
def update_checklist_item(
    item_id: UUID,
    payload: ChecklistItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(ChecklistItem)
        .options(
            selectinload(ChecklistItem.project).selectinload(Project.team).selectinload(Team.members),
            selectinload(ChecklistItem.assignee),
            selectinload(ChecklistItem.creator),
        )
        .where(ChecklistItem.id == item_id)
    )
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    team, _ = check_project_access(item.project, user, write=True)

    sent_fields = payload.model_dump(exclude_unset=True)

    if "assignee_id" in sent_fields:
        if payload.assignee_id is not None:
            is_active = any(m.user_id == payload.assignee_id and m.status == MemberStatus.active for m in team.members)
            if not is_active:
                raise HTTPException(status_code=400, detail="Assignee must be an active member of the team")
            item.assignee_id = payload.assignee_id
        else:
            item.assignee_id = None

    if "title" in sent_fields:
        item.title = payload.title

    if "url" in sent_fields:
        item.url = payload.url

    toggled = False
    if "is_done" in sent_fields:
        if payload.is_done != item.is_done:
            item.is_done = payload.is_done
            toggled = True
            if item.is_done:
                item.completed_at = datetime.now(timezone.utc)
            else:
                item.completed_at = None
            log_activity(
                db=db,
                project_id=item.project_id,
                actor_id=user.id,
                action="checklist_item_toggled",
                entity_type="checklist_item",
                entity_id=item.id,
                details={"item_title": item.title, "is_done": item.is_done, "actor_name": user.full_name},
            )

    other_changes = any(k in sent_fields for k in ("title", "assignee_id", "url"))
    if other_changes and not toggled:
        log_activity(
            db=db,
            project_id=item.project_id,
            actor_id=user.id,
            action="checklist_item_updated",
            entity_type="checklist_item",
            entity_id=item.id,
            details={"item_title": item.title, "actor_name": user.full_name},
        )

    db.commit()
    db.refresh(item)
    return _serialize_checklist_item(item)


@router.delete("/checklist/{item_id}")
def delete_checklist_item(
    item_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(ChecklistItem)
        .options(selectinload(ChecklistItem.project).selectinload(Project.team).selectinload(Team.members))
        .where(ChecklistItem.id == item_id)
    )
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    team, is_leader = check_project_access(item.project, user, write=True)
    if not (is_leader or item.created_by == user.id):
        raise HTTPException(status_code=403, detail="Only the creator or team leader can delete this checklist item")

    project_id = item.project_id
    item_title = item.title
    db.delete(item)

    log_activity(
        db=db,
        project_id=project_id,
        actor_id=user.id,
        action="checklist_item_deleted",
        entity_type="checklist_item",
        entity_id=item_id,
        details={"item_title": item_title, "actor_name": user.full_name},
    )

    db.commit()
    return {"ok": True}

