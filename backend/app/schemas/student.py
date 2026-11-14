from uuid import UUID

from pydantic import BaseModel

from app.schemas.profile import UserSkillOut


class StudentSearchItem(BaseModel):
    id: UUID
    full_name: str
    college: str | None = None
    branch: str | None = None
    year: str | None = None
    availability: str | None = None
    skills: list[UserSkillOut] = []
    preferred_roles: list[str] = []
    domains: list[str] = []
