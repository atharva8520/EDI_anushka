from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    profile_complete: bool


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    confirm_password: str
    college: str = Field(min_length=2, max_length=200)
    branch: str = Field(min_length=2, max_length=120)
    year: str = Field(min_length=1, max_length=20)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class UserPublic(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: str
    college: str | None
    branch: str | None
    year: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
