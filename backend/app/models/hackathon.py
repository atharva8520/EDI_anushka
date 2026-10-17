import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class HackathonStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    active = "active"
    completed = "completed"
    archived = "archived"


class Hackathon(Base):
    __tablename__ = "hackathons"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    short_description: Mapped[str] = mapped_column(String(320), nullable=False)
    banner_url: Mapped[str | None] = mapped_column(String(500))
    organizer: Mapped[str] = mapped_column(String(180), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    registration_deadline: Mapped[date] = mapped_column(Date, nullable=False)
    location: Mapped[str] = mapped_column(String(180), nullable=False)
    team_size_min: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    team_size_max: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    rules: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[HackathonStatus] = mapped_column(
        Enum(HackathonStatus, name="hackathon_status", native_enum=False, length=20),
        default=HackathonStatus.draft,
        index=True,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    domains = relationship("HackathonDomain", back_populates="hackathon", cascade="all, delete-orphan")
    problems = relationship("HackathonProblem", back_populates="hackathon", cascade="all, delete-orphan")
    criteria = relationship("JudgingCriterion", back_populates="hackathon", cascade="all, delete-orphan")
    teams = relationship("Team", back_populates="hackathon")


class HackathonDomain(Base):
    __tablename__ = "hackathon_domains"
    __table_args__ = (UniqueConstraint("hackathon_id", "domain", name="uq_hackathon_domain"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hackathon_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hackathons.id", ondelete="CASCADE"), index=True
    )
    domain: Mapped[str] = mapped_column(String(80), nullable=False)

    hackathon = relationship("Hackathon", back_populates="domains")


class HackathonProblem(Base):
    __tablename__ = "hackathon_problems"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hackathon_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hackathons.id", ondelete="CASCADE"), index=True
    )
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    target_users: Mapped[str] = mapped_column(Text, nullable=False)
    constraints: Mapped[str] = mapped_column(Text, nullable=False)
    expected_outcome: Mapped[str] = mapped_column(Text, nullable=False)
    evaluation_criteria: Mapped[str] = mapped_column(Text, nullable=False)
    required_technologies: Mapped[str | None] = mapped_column(String(255))
    is_published: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    hackathon = relationship("Hackathon", back_populates="problems")
    selections = relationship("TeamProblemSelection", back_populates="problem")


class JudgingCriterion(Base):
    __tablename__ = "judging_criteria"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hackathon_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hackathons.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    weight: Mapped[int] = mapped_column(Integer, default=25, nullable=False)

    hackathon = relationship("Hackathon", back_populates="criteria")
