from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.profile import PreviousProject, Profile, UserDomainInterest, UserPreferredRole, UserSkill
from app.models.skill import Skill
from app.models.user import User
from app.schemas.profile import ProfileOut, ProfileUpdate, SkillOut
from app.services.serializers import serialize_profile

router = APIRouter(tags=["users"])

USER_LOAD = (
    selectinload(User.profile),
    selectinload(User.skills).selectinload(UserSkill.skill),
    selectinload(User.preferred_roles),
    selectinload(User.domains),
    selectinload(User.previous_projects),
)


def _load_user(db: Session, user_id) -> User:
    user = db.scalar(select(User).options(*USER_LOAD).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users/me", response_model=ProfileOut)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_profile(_load_user(db, user.id))


@router.put("/users/me", response_model=ProfileOut)
def update_me(payload: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _load_user(db, user.id)
    if user.profile is None:
        user.profile = Profile()
        db.add(user.profile)

    for field in ("full_name", "college", "branch", "year"):
        value = getattr(payload, field)
        if value is not None:
            setattr(user, field, value)
    for field in ("bio", "github_url", "portfolio_url", "availability", "hackathon_experience"):
        value = getattr(payload, field)
        if value is not None:
            setattr(user.profile, field, value)

    if payload.preferred_roles is not None:
        user.preferred_roles.clear()
        db.flush()
        user.preferred_roles = [UserPreferredRole(role_name=r) for r in payload.preferred_roles]
    if payload.domains is not None:
        user.domains.clear()
        db.flush()
        user.domains = [UserDomainInterest(domain=d) for d in payload.domains]
    if payload.skills is not None:
        user.skills.clear()
        db.flush()
        user.skills = [UserSkill(skill_id=s.skill_id, proficiency=s.proficiency) for s in payload.skills]
    if payload.previous_projects is not None:
        user.previous_projects.clear()
        db.flush()
        user.previous_projects = [
            PreviousProject(
                title=p.title, description=p.description, tech_stack=p.tech_stack, year=p.year
            )
            for p in payload.previous_projects
        ]

    db.commit()
    return serialize_profile(_load_user(db, user.id))


@router.get("/skills", response_model=list[SkillOut])
def list_skills(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(Skill).order_by(Skill.category, Skill.name)).all()
