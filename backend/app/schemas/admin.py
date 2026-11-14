"""Pydantic schemas for the admin dashboard and administration endpoints."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminTeamListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    hackathon_id: UUID
    hackathon_name: str
    leader_name: str
    member_count: int
    team_size_min: int
    team_size_max: int
    is_ready: bool
    selected_problem_title: str | None = None
    has_project: bool
    tasks_total: int
    tasks_completed: int
    percent_complete: int
    created_at: datetime


class AdminTeamMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    college: str | None = None
    member_role: str
    joined_at: datetime
    is_leader: bool


class AdminSelectedProblemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    title: str
    domain: str


class AdminProjectSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_counts: dict[str, int]
    percent_complete: int
    checklist_percent: int


class AdminTeamDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    hackathon_id: UUID
    hackathon_name: str
    leader_name: str
    created_at: datetime
    members: list[AdminTeamMemberOut]
    selected_problem: AdminSelectedProblemOut | None = None
    project_summary: AdminProjectSummaryOut | None = None


class AdminParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: str
    college: str | None = None
    branch: str | None = None
    year: str | None = None
    team_name: str | None = None


class AdminActivityDay(BaseModel):
    date: str
    new_students: int
    new_teams: int
    tasks_completed: int


class AdminHackathonActivity(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    status: str
    team_count: int
    participant_count: int
    ready_team_count: int
    teams_with_problem: int
    teams_with_project: int
    tasks_total: int
    tasks_completed: int


class AdminActivityOut(BaseModel):
    days: int
    series: list[AdminActivityDay]
    hackathons: list[AdminHackathonActivity]
