from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.hackathon import HackathonStatus


class DomainIn(BaseModel):
    domain: str = Field(min_length=2, max_length=80)


class CriterionIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=4)
    weight: int = Field(ge=1, le=100)


class CriterionOut(CriterionIn):
    id: UUID

    model_config = {"from_attributes": True}


class ProblemCreate(BaseModel):
    code: str = Field(min_length=2, max_length=20)
    title: str = Field(min_length=4, max_length=200)
    statement: str = Field(min_length=20)
    description: str = Field(min_length=20)
    domain: str
    target_users: str
    constraints: str
    expected_outcome: str
    evaluation_criteria: str
    required_technologies: str | None = None
    is_published: bool = True


class ProblemUpdate(BaseModel):
    code: str | None = None
    title: str | None = None
    statement: str | None = None
    description: str | None = None
    domain: str | None = None
    target_users: str | None = None
    constraints: str | None = None
    expected_outcome: str | None = None
    evaluation_criteria: str | None = None
    required_technologies: str | None = None
    is_published: bool | None = None


class ProblemOut(ProblemCreate):
    id: UUID
    hackathon_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ProblemSummary(BaseModel):
    id: UUID
    code: str
    title: str
    domain: str
    description: str
    is_published: bool

    model_config = {"from_attributes": True}


class HackathonCreate(BaseModel):
    name: str = Field(min_length=4, max_length=180)
    description: str = Field(min_length=20)
    short_description: str = Field(min_length=10, max_length=320)
    banner_url: str | None = None
    organizer: str = Field(min_length=2, max_length=180)
    start_date: date
    end_date: date
    registration_deadline: date
    location: str
    team_size_min: int = Field(ge=1, le=10)
    team_size_max: int = Field(ge=1, le=12)
    rules: str
    domains: list[str] = Field(min_length=1)
    criteria: list[CriterionIn] = Field(min_length=1)
    status: HackathonStatus = HackathonStatus.draft


class HackathonUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    short_description: str | None = None
    banner_url: str | None = None
    organizer: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    registration_deadline: date | None = None
    location: str | None = None
    team_size_min: int | None = None
    team_size_max: int | None = None
    rules: str | None = None
    domains: list[str] | None = None
    criteria: list[CriterionIn] | None = None
    status: HackathonStatus | None = None


class HackathonOut(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str
    short_description: str
    banner_url: str | None
    organizer: str
    start_date: date
    end_date: date
    registration_deadline: date
    location: str
    team_size_min: int
    team_size_max: int
    rules: str
    status: HackathonStatus
    domains: list[str]
    criteria: list[CriterionOut]
    problem_count: int
    team_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class HackathonListItem(BaseModel):
    id: UUID
    name: str
    slug: str
    short_description: str
    banner_url: str | None
    organizer: str
    start_date: date
    end_date: date
    registration_deadline: date
    location: str
    team_size_min: int
    team_size_max: int
    status: HackathonStatus
    domains: list[str]
    problem_count: int
    team_count: int

    model_config = {"from_attributes": True}


class StatusUpdate(BaseModel):
    status: HackathonStatus
