from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import bearer, require_admin
from app.core.security import decode_token
from app.database.session import get_db
from app.models.hackathon import Hackathon, HackathonDomain, HackathonProblem, HackathonStatus, JudgingCriterion
from app.models.user import User
from app.schemas.hackathon import (
    HackathonCreate,
    HackathonListItem,
    HackathonOut,
    HackathonUpdate,
    ProblemCreate,
    ProblemOut,
    ProblemSummary,
    ProblemUpdate,
    StatusUpdate,
)
from app.services.ids import unique_slug
from app.services.serializers import serialize_hackathon, serialize_hackathon_list, serialize_problem

router = APIRouter(tags=["hackathons"])

HACKATHON_LOAD = (
    selectinload(Hackathon.domains),
    selectinload(Hackathon.criteria),
    selectinload(Hackathon.problems),
    selectinload(Hackathon.teams),
)


def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    try:
        payload = decode_token(credentials.credentials)
        return db.get(User, UUID(payload["sub"]))
    except (ValueError, KeyError):
        return None


def _get_hackathon(db: Session, hackathon_id: UUID) -> Hackathon:
    item = db.scalar(select(Hackathon).options(*HACKATHON_LOAD).where(Hackathon.id == hackathon_id))
    if not item:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return item


@router.get("/hackathons", response_model=list[HackathonListItem])
def list_hackathons(
    q: str | None = None,
    domain: str | None = None,
    status: HackathonStatus | None = None,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    stmt = select(Hackathon).options(*HACKATHON_LOAD)
    is_admin = user is not None and user.role.value == "admin"
    if not is_admin:
        visible = [HackathonStatus.published, HackathonStatus.active, HackathonStatus.completed]
        if status:
            if status not in visible:
                return []
            stmt = stmt.where(Hackathon.status == status)
        else:
            stmt = stmt.where(Hackathon.status.in_(visible))
    elif status:
        stmt = stmt.where(Hackathon.status == status)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Hackathon.name.ilike(like),
                Hackathon.short_description.ilike(like),
                HackathonDomain.domain.ilike(like),
            )
        ).join(Hackathon.domains, isouter=True)
    if domain:
        stmt = stmt.join(Hackathon.domains).where(HackathonDomain.domain.ilike(domain))
    items = db.scalars(stmt.order_by(Hackathon.start_date.desc())).unique().all()
    return [serialize_hackathon_list(h) for h in items]


@router.get("/hackathons/{hackathon_id}", response_model=HackathonOut)
def get_hackathon(hackathon_id: UUID, db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    item = _get_hackathon(db, hackathon_id)
    is_admin = user is not None and user.role.value == "admin"
    if not is_admin and item.status in {HackathonStatus.draft, HackathonStatus.archived}:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return serialize_hackathon(item)


@router.post("/hackathons", response_model=HackathonOut, status_code=201)
def create_hackathon(payload: HackathonCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if payload.team_size_max < payload.team_size_min:
        raise HTTPException(status_code=400, detail="Maximum team size must be greater than or equal to minimum")
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    hackathon = Hackathon(
        name=payload.name,
        slug=unique_slug(db, payload.name),
        description=payload.description,
        short_description=payload.short_description,
        banner_url=payload.banner_url,
        organizer=payload.organizer,
        start_date=payload.start_date,
        end_date=payload.end_date,
        registration_deadline=payload.registration_deadline,
        location=payload.location,
        team_size_min=payload.team_size_min,
        team_size_max=payload.team_size_max,
        rules=payload.rules,
        status=payload.status,
        created_by=admin.id,
        domains=[HackathonDomain(domain=d) for d in payload.domains],
        criteria=[
            JudgingCriterion(title=c.title, description=c.description, weight=c.weight) for c in payload.criteria
        ],
    )
    db.add(hackathon)
    db.commit()
    return serialize_hackathon(_get_hackathon(db, hackathon.id))


@router.put("/hackathons/{hackathon_id}", response_model=HackathonOut)
def update_hackathon(
    hackathon_id: UUID,
    payload: HackathonUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    item = _get_hackathon(db, hackathon_id)
    data = payload.model_dump(exclude_unset=True)
    domains = data.pop("domains", None)
    criteria = data.pop("criteria", None)
    name = data.get("name")
    if name and name != item.name:
        item.slug = unique_slug(db, name)
    for key, value in data.items():
        setattr(item, key, value)
    if domains is not None:
        item.domains.clear()
        db.flush()
        item.domains = [HackathonDomain(domain=d) for d in domains]
    if criteria is not None:
        item.criteria.clear()
        db.flush()
        item.criteria = [
            JudgingCriterion(title=c["title"], description=c["description"], weight=c["weight"]) for c in criteria
        ]
    db.commit()
    return serialize_hackathon(_get_hackathon(db, hackathon_id))


@router.post("/hackathons/{hackathon_id}/status", response_model=HackathonOut)
def set_status(
    hackathon_id: UUID,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    item = _get_hackathon(db, hackathon_id)
    item.status = payload.status
    db.commit()
    return serialize_hackathon(_get_hackathon(db, hackathon_id))


@router.get("/hackathons/{hackathon_id}/problems", response_model=list[ProblemSummary])
def list_problems(hackathon_id: UUID, db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    item = _get_hackathon(db, hackathon_id)
    is_admin = user is not None and user.role.value == "admin"
    problems = item.problems if is_admin else [p for p in item.problems if p.is_published]
    return problems


@router.get("/problems/{problem_id}", response_model=ProblemOut)
def get_problem(problem_id: UUID, db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    problem = db.get(HackathonProblem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    is_admin = user is not None and user.role.value == "admin"
    if not problem.is_published and not is_admin:
        raise HTTPException(status_code=404, detail="Problem not found")
    return serialize_problem(problem)


@router.post("/hackathons/{hackathon_id}/problems", response_model=ProblemOut, status_code=201)
def create_problem(
    hackathon_id: UUID,
    payload: ProblemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    _get_hackathon(db, hackathon_id)
    problem = HackathonProblem(hackathon_id=hackathon_id, **payload.model_dump())
    db.add(problem)
    db.commit()
    db.refresh(problem)
    return serialize_problem(problem)


@router.put("/problems/{problem_id}", response_model=ProblemOut)
def update_problem(
    problem_id: UUID,
    payload: ProblemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    problem = db.get(HackathonProblem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(problem, key, value)
    db.commit()
    db.refresh(problem)
    return serialize_problem(problem)


@router.delete("/problems/{problem_id}", status_code=204)
def delete_problem(problem_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    problem = db.get(HackathonProblem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    if problem.selections:
        raise HTTPException(status_code=409, detail="Cannot delete a problem that teams have already selected")
    db.delete(problem)
    db.commit()
