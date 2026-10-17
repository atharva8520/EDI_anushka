from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.team import InviteStatus, MemberStatus
from app.schemas.profile import UserSkillOut


class TeamCreate(BaseModel):
    hackathon_id: UUID
    name: str = Field(min_length=2, max_length=120)
    member_role: str = "Team Lead"


class TeamJoin(BaseModel):
    invite_code: str = Field(min_length=4, max_length=12)
    member_role: str = "Member"


class MemberRoleUpdate(BaseModel):
    member_role: str = Field(min_length=2, max_length=80)


class InviteCreate(BaseModel):
    email: str


class ProblemSelect(BaseModel):
    problem_id: UUID


class MemberOut(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    email: str
    member_role: str
    status: MemberStatus
    college: str | None
    skills: list[UserSkillOut]
    preferred_roles: list[str]
    availability: str | None


class SelectedProblemOut(BaseModel):
    id: UUID
    code: str
    title: str
    domain: str
    description: str
    selected_at: datetime


class TeamOut(BaseModel):
    id: UUID
    name: str
    invite_code: str
    hackathon_id: UUID
    hackathon_name: str
    leader_id: UUID
    leader_name: str
    members: list[MemberOut]
    selected_problem: SelectedProblemOut | None
    created_at: datetime
    is_leader: bool


class InviteOut(BaseModel):
    id: UUID
    team_id: UUID
    team_name: str
    hackathon_name: str
    status: InviteStatus
    created_at: datetime


class SkillMapItem(BaseModel):
    category: str
    coverage: int
    members: int


class TeamWorkspaceOut(BaseModel):
    team: TeamOut
    skill_map: list[SkillMapItem]
    missing_capabilities: list[str]
