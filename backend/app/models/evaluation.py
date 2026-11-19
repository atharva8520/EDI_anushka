"""SQLAlchemy models for Project Evaluations, Criterion Scores, and Judging."""

from __future__ import annotations

from datetime import datetime
import uuid

from sqlalchemy import DateTime, Float, ForeignKey, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ProjectEvaluation(Base):
    __tablename__ = "project_evaluations"
    __table_args__ = (
        UniqueConstraint("project_id", "judge_id", name="uq_project_judge_evaluation"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    hackathon_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    judge_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    project = relationship("Project", back_populates="evaluations")
    hackathon = relationship("Hackathon")
    judge = relationship("User", foreign_keys=[judge_id])
    criterion_scores = relationship(
        "CriterionScore", back_populates="evaluation", cascade="all, delete-orphan"
    )


class CriterionScore(Base):
    __tablename__ = "criterion_scores"
    __table_args__ = (
        UniqueConstraint("evaluation_id", "criterion_id", name="uq_evaluation_criterion"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("project_evaluations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    criterion_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("judging_criteria.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    evaluation = relationship("ProjectEvaluation", back_populates="criterion_scores")
    criterion = relationship("JudgingCriterion")
