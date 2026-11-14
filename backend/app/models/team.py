import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class MemberStatus(str, enum.Enum):
    active = "active"
    invited = "invited"
    left = "left"


class InviteStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class Team(Base):
    __tablename__ = "teams"
    __table_args__ = (UniqueConstraint("hackathon_id", "name", name="uq_team_name_per_hackathon"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hackathon_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hackathons.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    invite_code: Mapped[str] = mapped_column(String(12), unique=True, index=True, nullable=False)
    leader_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    hackathon = relationship("Hackathon", back_populates="teams")
    leader = relationship("User", back_populates="led_teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    problem_selection = relationship(
        "TeamProblemSelection", back_populates="team", uselist=False, cascade="all, delete-orphan"
    )
    invites = relationship("TeamInvite", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_member"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    member_role: Mapped[str] = mapped_column(String(80), default="Member")
    status: Mapped[MemberStatus] = mapped_column(Enum(MemberStatus, name="member_status", native_enum=False, length=20), default=MemberStatus.active)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="memberships")


class TeamProblemSelection(Base):
    __tablename__ = "team_problem_selections"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), unique=True
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hackathon_problems.id", ondelete="RESTRICT"), index=True
    )
    selected_by: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"))
    selected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team = relationship("Team", back_populates="problem_selection")
    problem = relationship("HackathonProblem", back_populates="selections")


class TeamInvite(Base):
    __tablename__ = "team_invites"
    __table_args__ = (UniqueConstraint("team_id", "invitee_id", name="uq_team_invitee"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    inviter_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"))
    invitee_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True)
    status: Mapped[InviteStatus] = mapped_column(Enum(InviteStatus, name="invite_status", native_enum=False, length=20), default=InviteStatus.pending)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team = relationship("Team", back_populates="invites")
    invitee = relationship("User", foreign_keys=[invitee_id])
