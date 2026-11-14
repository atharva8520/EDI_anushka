from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import ActivityLog, Project, Task, TaskStatus
from app.models.team import MemberStatus, Team
from app.models.user import User, UserRole


def check_project_access(project: Project, user: User, write: bool = False) -> tuple[Team, bool]:
    """
    Permission rules:
    - Only ACTIVE members of the project's team may read or write.
    - Admins may read but not write.
    - Everyone else gets 403.
    Returns (team, is_leader).
    """
    team = project.team
    if user.role == UserRole.admin:
        if write:
            raise HTTPException(status_code=403, detail="Admins have read-only access to projects")
        return team, False

    member = next((m for m in team.members if m.user_id == user.id and m.status == MemberStatus.active), None)
    if not member:
        raise HTTPException(status_code=403, detail="You are not an active member of this project's team")

    is_leader = team.leader_id == user.id
    return team, is_leader


def log_activity(
    db: Session,
    project_id: UUID,
    actor_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID | None = None,
    details: dict | None = None,
) -> ActivityLog:
    """
    Log project activity in the same transaction.
    Guaranteed: details never contain emails (only IDs, names, titles, and field changes).
    """
    clean_details = dict(details or {})
    # Strip any accidental email fields
    for k in list(clean_details.keys()):
        if "email" in k.lower():
            del clean_details[k]

    entry = ActivityLog(
        project_id=project_id,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=clean_details,
    )
    db.add(entry)
    return entry


def unassign_member_tasks(db: Session, team: Team, user_id: UUID, actor_id: UUID | None = None) -> list[Task]:
    """
    When a member leaves or is removed, unassign all their tasks and checklist items, and log it.
    Shared helper called from leave_team and remove_member.
    """
    if not team.project:
        return []

    unassigned_tasks = []
    for task in team.project.tasks:
        if task.assignee_id == user_id:
            task.assignee_id = None
            unassigned_tasks.append(task)
            log_activity(
                db=db,
                project_id=team.project.id,
                actor_id=actor_id,
                action="task_unassigned",
                entity_type="task",
                entity_id=task.id,
                details={
                    "task_title": task.title,
                    "unassigned_user_id": str(user_id),
                    "reason": "member_left",
                },
            )

    for item in getattr(team.project, "checklist_items", []):
        if item.assignee_id == user_id:
            item.assignee_id = None
            log_activity(
                db=db,
                project_id=team.project.id,
                actor_id=actor_id,
                action="checklist_item_unassigned",
                entity_type="checklist_item",
                entity_id=item.id,
                details={
                    "item_title": item.title,
                    "unassigned_user_id": str(user_id),
                    "reason": "member_left",
                },
            )

    return unassigned_tasks


def reindex_column_positions(tasks: list[Task]) -> None:
    """Ensure contiguous 0-indexed positions within a column."""
    for idx, t in enumerate(tasks):
        t.position = idx


def move_task(
    db: Session,
    task: Task,
    new_status: TaskStatus,
    new_position: int,
    user: User,
) -> Task:
    """
    Atomic task movement with status/position reindexing.
    Clamps positions beyond the end of the column.
    Updates completed_at when moving to/out of completed.
    Logs task_moved activity.
    """
    project = task.project
    old_status = task.status
    old_position = task.position

    # Fetch all tasks in project to manipulate columns in memory/transaction
    all_tasks = project.tasks

    if old_status == new_status:
        # Moving within same column
        column_tasks = [t for t in all_tasks if t.status == old_status and t.id != task.id]
        column_tasks.sort(key=lambda x: x.position)
        clamped_pos = min(new_position, len(column_tasks))
        column_tasks.insert(clamped_pos, task)
        reindex_column_positions(column_tasks)
    else:
        # Moving to a different column
        # 1. Remove from old column and reindex old column
        old_column_tasks = [t for t in all_tasks if t.status == old_status and t.id != task.id]
        old_column_tasks.sort(key=lambda x: x.position)
        reindex_column_positions(old_column_tasks)

        # 2. Insert into new column and reindex new column
        new_column_tasks = [t for t in all_tasks if t.status == new_status and t.id != task.id]
        new_column_tasks.sort(key=lambda x: x.position)
        clamped_pos = min(new_position, len(new_column_tasks))
        new_column_tasks.insert(clamped_pos, task)

        task.status = new_status
        reindex_column_positions(new_column_tasks)

        # 3. Handle completed_at timestamp
        if new_status == TaskStatus.completed:
            task.completed_at = datetime.now(timezone.utc)
        elif old_status == TaskStatus.completed:
            task.completed_at = None

    log_activity(
        db=db,
        project_id=project.id,
        actor_id=user.id,
        action="task_moved",
        entity_type="task",
        entity_id=task.id,
        details={
            "task_title": task.title,
            "from_status": old_status.value,
            "to_status": new_status.value,
            "from_position": old_position,
            "to_position": task.position,
        },
    )
    return task
