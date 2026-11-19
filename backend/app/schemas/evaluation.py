"""Pydantic schemas for Judging, Evaluations, and Leaderboard."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CriterionScoreIn(BaseModel):
    criterion_id: UUID
    score: float = Field(..., ge=1.0, le=10.0, description="Score from 1.0 to 10.0")
    notes: str | None = Field(default=None, max_length=500)


class EvaluationCreate(BaseModel):
    feedback: str | None = Field(default=None, max_length=2000, description="Qualitative feedback for the team")
    scores: list[CriterionScoreIn] = Field(..., min_length=1, description="Scores per hackathon criterion")


class CriterionScoreOut(BaseModel):
    criterion_id: UUID
    criterion_title: str
    criterion_weight: int
    score: float
    notes: str | None = None


class EvaluationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    hackathon_id: UUID
    judge_id: UUID
    judge_name: str
    total_score: float
    feedback: str | None = None
    scores: list[CriterionScoreOut] = []
    created_at: datetime
    updated_at: datetime


class LeaderboardItemOut(BaseModel):
    rank: int
    project_id: UUID
    project_title: str
    team_id: UUID
    team_name: str
    problem_title: str | None = None
    problem_domain: str | None = None
    repo_url: str | None = None
    demo_url: str | None = None
    tech_stack: list[str] = []
    average_score: float
    evaluation_count: int
    badge: str | None = None
