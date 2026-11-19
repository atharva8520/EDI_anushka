"""Pydantic schemas for Project Submissions."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectSubmitRequest(BaseModel):
    repo_url: str = Field(..., min_length=5, max_length=500, description="GitHub, GitLab, or source repo URL")
    demo_url: str | None = Field(default=None, max_length=500, description="Live deployment or preview URL")
    video_url: str | None = Field(default=None, max_length=500, description="Loom, YouTube, or demo video URL")
    pitch_deck_url: str | None = Field(default=None, max_length=500, description="Slide deck or PDF URL")
    tech_stack: list[str] = Field(default_factory=list, description="List of technologies used")
    submission_notes: str | None = Field(default=None, max_length=2000, description="Key notes for judges")


class ProjectSubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    team_id: UUID
    team_name: str
    title: str
    summary: str | None = None
    repo_url: str | None = None
    demo_url: str | None = None
    video_url: str | None = None
    pitch_deck_url: str | None = None
    tech_stack: list[str] = []
    is_submitted: bool = False
    submitted_at: datetime | None = None
    submitted_by: UUID | None = None
    submitted_by_name: str | None = None
    submission_notes: str | None = None
