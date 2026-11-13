from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.models.profile import Availability, Proficiency


class SkillOut(BaseModel):
    id: UUID
    name: str
    category: str

    model_config = {"from_attributes": True}


class UserSkillIn(BaseModel):
    skill_id: UUID
    proficiency: Proficiency


class UserSkillOut(BaseModel):
    skill_id: UUID
    name: str
    category: str
    proficiency: Proficiency


class PreviousProjectIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    description: str | None = None
    tech_stack: str | None = None
    year: int | None = None


class PreviousProjectOut(PreviousProjectIn):
    id: UUID

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    college: str | None = None
    branch: str | None = None
    year: str | None = None
    bio: str | None = Field(default=None, max_length=2000)
    github_url: str | None = None
    portfolio_url: str | None = None
    availability: Availability | None = None
    hackathon_experience: str | None = None
    preferred_roles: list[str] | None = None
    domains: list[str] | None = None
    skills: list[UserSkillIn] | None = None
    previous_projects: list[PreviousProjectIn] | None = None

    @field_validator("github_url", "portfolio_url", mode="before")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if v == "":
            return ""
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class ProfileOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    college: str | None
    branch: str | None
    year: str | None
    bio: str | None
    github_url: str | None
    portfolio_url: str | None
    availability: Availability | None
    hackathon_experience: str | None
    preferred_roles: list[str]
    domains: list[str]
    skills: list[UserSkillOut]
    previous_projects: list[PreviousProjectOut]
    completion_percent: int
    missing_fields: list[str]
