from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.project import TaskPriority, TaskStatus


class ProjectCreate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    summary: str | None = None


class ProjectOut(BaseModel):
    id: UUID
    team_id: UUID
    title: str
    summary: str | None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    team_name: str
    problem_title: str | None

    model_config = {"from_attributes": True}


class MilestoneCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    due_date: date | None = None


class MilestoneUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    due_date: date | None = None


class MilestoneOut(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: str | None
    due_date: date | None
    created_at: datetime
    task_count: int = 0
    completed_task_count: int = 0

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    priority: TaskPriority = TaskPriority.medium
    status: TaskStatus = TaskStatus.todo
    assignee_id: UUID | None = None
    milestone_id: UUID | None = None
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    priority: TaskPriority | None = None
    assignee_id: UUID | None = None
    milestone_id: UUID | None = None
    due_date: date | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_status_and_position(cls, values):
        if isinstance(values, dict):
            if "status" in values:
                raise ValueError("Status cannot be updated via PATCH /api/tasks/{id}. Use PATCH /api/tasks/{id}/move instead.")
            if "position" in values:
                raise ValueError("Position cannot be updated via PATCH /api/tasks/{id}. Use PATCH /api/tasks/{id}/move instead.")
        return values


class TaskMove(BaseModel):
    status: TaskStatus
    position: int = Field(..., ge=0)


class TaskOut(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: str | None
    priority: TaskPriority
    status: TaskStatus
    assignee_id: UUID | None
    assignee_name: str | None
    created_by: UUID
    creator_name: str | None
    milestone_id: UUID | None
    milestone_title: str | None
    due_date: date | None
    position: int
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ActivityLogOut(BaseModel):
    id: UUID
    project_id: UUID
    actor_id: UUID | None
    actor_name: str | None
    action: str
    entity_type: str
    entity_id: UUID | None
    details: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class MemberWorkload(BaseModel):
    user_id: UUID
    full_name: str
    open_tasks: int
    completed_tasks: int


class MilestoneProgress(BaseModel):
    id: UUID
    title: str
    due_date: date | None
    total_tasks: int
    completed_tasks: int
    percent_complete: int


class ProjectSummaryOut(BaseModel):
    total_tasks: int
    todo_count: int
    in_progress_count: int
    review_count: int
    completed_count: int
    percent_complete: int
    overdue_count: int
    unassigned_count: int
    workload: list[MemberWorkload]
    milestone_progress: list[MilestoneProgress]
