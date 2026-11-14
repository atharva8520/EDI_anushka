from datetime import date, datetime
import re
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.project import TaskPriority, TaskStatus

GITHUB_REPO_REGEX = re.compile(r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(/.*)?")


class ProjectCreate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    summary: str | None = None


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    summary: str | None = None
    repo_url: str | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is not None:
            v_stripped = v.strip()
            if not v_stripped:
                raise ValueError("Title cannot be empty")
            return v_stripped
        return v

    @field_validator("repo_url")
    @classmethod
    def validate_repo_url(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v_stripped = v.strip()
        if not v_stripped:
            return None
        if not GITHUB_REPO_REGEX.fullmatch(v_stripped):
            raise ValueError("repo_url must match https://github.com/<owner>/<repo>")
        return v_stripped


class ProjectOut(BaseModel):
    id: UUID
    team_id: UUID
    title: str
    summary: str | None
    repo_url: str | None = None
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
    checklist_total: int = 0
    checklist_done: int = 0
    checklist_percent: int = 0
    notes_count: int = 0
    repo_url: str | None = None


# --- Module 6: Execution & Collaboration Schemas ---

class NoteCreate(BaseModel):
    title: str = Field(..., max_length=200)
    body: str = Field(..., max_length=20000)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Title cannot be empty")
        return v_stripped

    @field_validator("body")
    @classmethod
    def validate_body(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Body cannot be empty")
        if len(v_stripped) > 20000:
            raise ValueError("Body cannot exceed 20000 characters")
        return v_stripped


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=20000)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is not None:
            v_stripped = v.strip()
            if not v_stripped:
                raise ValueError("Title cannot be empty")
            return v_stripped
        return v

    @field_validator("body")
    @classmethod
    def validate_body(cls, v: str | None) -> str | None:
        if v is not None:
            v_stripped = v.strip()
            if not v_stripped:
                raise ValueError("Body cannot be empty")
            if len(v_stripped) > 20000:
                raise ValueError("Body cannot exceed 20000 characters")
            return v_stripped
        return v


class NoteOut(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    body: str
    created_by: UUID | None
    creator_name: str | None = None
    updated_by: UUID | None
    updater_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChecklistItemCreate(BaseModel):
    title: str = Field(..., max_length=200)
    assignee_id: UUID | None = None
    url: str | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Title cannot be empty")
        return v_stripped

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v_stripped = v.strip()
        if not v_stripped:
            return None
        if not (v_stripped.startswith("http://") or v_stripped.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v_stripped


class ChecklistItemUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    is_done: bool | None = None
    assignee_id: UUID | None = None
    url: str | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is not None:
            v_stripped = v.strip()
            if not v_stripped:
                raise ValueError("Title cannot be empty")
            return v_stripped
        return v

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v_stripped = v.strip()
        if not v_stripped:
            return None
        if not (v_stripped.startswith("http://") or v_stripped.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v_stripped


class ChecklistItemOut(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    is_done: bool
    assignee_id: UUID | None
    assignee_name: str | None = None
    url: str | None
    position: int
    completed_at: datetime | None
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

