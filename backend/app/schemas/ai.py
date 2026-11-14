"""Pydantic schemas for AI and smart suggestions."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CandidateScoreBreakdown(BaseModel):
    category_complement: float
    skill_depth: float
    domain_overlap: float
    availability: float
    preferred_role: float


class CandidateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    college: str | None = None
    branch: str | None = None
    year: str | None = None
    score: float
    features: CandidateScoreBreakdown
    reasons: list[str]
    invite_pending: bool = False


class TeammateRecommendationsOut(BaseModel):
    run_id: UUID
    c_target: list[str]
    excluded_incomplete_count: int
    recommendations: list[CandidateOut]


class SkillGapItem(BaseModel):
    type: str  # "skill" or "category"
    term: str
    name: str | None = None
    category: str | None = None
    status: str  # "covered", "partial", "missing"
    strength: int | None = None


class SkillGapSummary(BaseModel):
    total_required: int
    covered: int
    partial: int
    missing: int
    unclassified: int


class SkillGapOut(BaseModel):
    run_id: UUID
    problem_id: UUID
    problem_title: str
    problem_code: str | None = None
    covered: list[SkillGapItem]
    partial: list[SkillGapItem]
    missing: list[SkillGapItem]
    unclassified: list[str]
    summary: SkillGapSummary


class AIFeedbackCreate(BaseModel):
    run_id: UUID
    candidate_id: UUID | None = None
    rating: int = Field(..., description="+1 for helpful, -1 for unhelpful")
    comment: str | None = Field(default=None, max_length=500)


class AIFeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    run_id: UUID
    user_id: UUID | None = None
    candidate_id: UUID | None = None
    rating: int
    comment: str | None = None
    created_at: datetime


class FeedbackCommentOut(BaseModel):
    rating: int
    comment: str
    created_at: datetime


class FeedbackSummaryOut(BaseModel):
    total_runs: int
    total_feedback: int
    positive_count: int
    negative_count: int
    satisfaction_rate: float
    avg_features_up: CandidateScoreBreakdown
    avg_features_down: CandidateScoreBreakdown
    recent_comments: list[FeedbackCommentOut]
