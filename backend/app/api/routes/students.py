from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.profile import Availability, Profile, UserDomainInterest, UserSkill
from app.models.skill import Skill
from app.models.team import MemberStatus, TeamMember
from app.models.user import User, UserRole
from app.schemas.profile import UserSkillOut
from app.schemas.student import StudentSearchItem

router = APIRouter(tags=["students"])


@router.get("/students", response_model=list[StudentSearchItem])
def search_students(
    response: Response,
    q: str | None = None,
    skill: str | None = None,
    domain: str | None = None,
    availability: Availability | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can browse teammates")

    # Base query: active students only, excluding caller
    stmt = select(User).where(
        User.role == UserRole.student,
        User.is_active.is_(True),
        User.id != user.id,
    )

    # Exclude users with an active team membership
    has_active_team = (
        select(1)
        .where(
            TeamMember.user_id == User.id,
            TeamMember.status == MemberStatus.active,
        )
        .exists()
    )
    stmt = stmt.where(~has_active_team)

    if q and q.strip():
        stmt = stmt.where(User.full_name.ilike(f"%{q.strip()}%"))

    if skill and skill.strip():
        skill_match = (
            select(1)
            .select_from(UserSkill)
            .join(Skill, UserSkill.skill_id == Skill.id)
            .where(
                UserSkill.user_id == User.id,
                Skill.name.ilike(f"%{skill.strip()}%"),
            )
            .exists()
        )
        stmt = stmt.where(skill_match)

    if domain and domain.strip():
        domain_match = (
            select(1)
            .select_from(UserDomainInterest)
            .where(
                UserDomainInterest.user_id == User.id,
                UserDomainInterest.domain.ilike(f"%{domain.strip()}%"),
            )
            .exists()
        )
        stmt = stmt.where(domain_match)

    if availability is not None:
        avail_match = (
            select(1)
            .select_from(Profile)
            .where(
                Profile.user_id == User.id,
                Profile.availability == availability,
            )
            .exists()
        )
        stmt = stmt.where(avail_match)

    # Total count calculation
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    # Paginate and load relationships
    paginated_stmt = (
        stmt.options(
            selectinload(User.profile),
            selectinload(User.skills).selectinload(UserSkill.skill),
            selectinload(User.preferred_roles),
            selectinload(User.domains),
        )
        .order_by(User.full_name.asc())
        .offset(skip)
        .limit(limit)
    )

    users = db.scalars(paginated_stmt).all()

    results = []
    for u in users:
        results.append(
            StudentSearchItem(
                id=u.id,
                full_name=u.full_name,
                college=u.college,
                branch=u.branch,
                year=u.year,
                availability=u.profile.availability.value if u.profile and u.profile.availability else None,
                skills=[
                    UserSkillOut(
                        skill_id=s.skill_id,
                        name=s.skill.name,
                        category=s.skill.category,
                        proficiency=s.proficiency,
                    )
                    for s in u.skills
                ],
                preferred_roles=[r.role_name for r in u.preferred_roles],
                domains=[d.domain for d in u.domains],
            )
        )
    return results
