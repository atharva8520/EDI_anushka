from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import bearer, require_admin
from app.core.security import decode_token
from app.database.session import get_db
from app.models.hackathon import Hackathon, HackathonDomain, HackathonProblem, HackathonStatus, JudgingCriterion
from app.models.team import MemberStatus, Team
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
    selectinload(Hackathon.teams).selectinload(Team.members),
)


ALLOWED_TRANSITIONS: dict[HackathonStatus, set[HackathonStatus]] = {
    HackathonStatus.draft: {HackathonStatus.published, HackathonStatus.archived},
    HackathonStatus.published: {HackathonStatus.draft, HackathonStatus.active, HackathonStatus.archived},
    HackathonStatus.active: {HackathonStatus.completed, HackathonStatus.archived},
    HackathonStatus.completed: {HackathonStatus.archived},
    HackathonStatus.archived: {HackathonStatus.draft},
}


def validate_status_transition(
    current_status: HackathonStatus,
    target_status: HackathonStatus,
    hackathon: Hackathon,
    effective_criteria: list | None = None,
) -> None:
    if target_status == current_status:
        return

    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        allowed_str = ", ".join(sorted([s.value for s in allowed]))
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current_status.value}' to '{target_status.value}'. Allowed next statuses: {allowed_str}",
        )

    # Moving to published or active requires criteria weights totalling 100
    if target_status in {HackathonStatus.published, HackathonStatus.active}:
        criteria = effective_criteria if effective_criteria is not None else hackathon.criteria
        total_weight = sum(c.weight if hasattr(c, "weight") else c["weight"] for c in criteria)
        if total_weight != 100:
            raise HTTPException(
                status_code=400,
                detail=f"Judging criteria weights must total 100, got {total_weight}",
            )

    # Moving to active additionally requires at least one published problem
    if target_status == HackathonStatus.active:
        has_published = any(p.is_published for p in hackathon.problems)
        if not has_published:
            raise HTTPException(
                status_code=400,
                detail="Cannot activate hackathon without at least one published problem",
            )

    # Published to draft is only allowed if the hackathon has no teams
    if current_status == HackathonStatus.published and target_status == HackathonStatus.draft:
        if len(hackathon.teams) > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot move published hackathon to draft because teams have already registered",
            )


def validate_hackathon_fields(
    team_size_min: int,
    team_size_max: int,
    start_date: date,
    end_date: date,
    registration_deadline: date,
    domains: list[str] | None = None,
    criteria: list | None = None,
) -> tuple[list[str] | None, list | None]:
    if team_size_min > team_size_max:
        raise HTTPException(
            status_code=400,
            detail="Maximum team size must be greater than or equal to minimum",
        )
    if end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail="End date must be on or after start date",
        )
    if registration_deadline > end_date:
        raise HTTPException(
            status_code=400,
            detail="Registration deadline must be on or before end date",
        )

    cleaned_domains = None
    if domains is not None:
        raw_cleaned = [d.strip() for d in domains if d and d.strip()]
        seen = set()
        cleaned_domains = []
        for d in raw_cleaned:
            low = d.lower()
            if low not in seen:
                seen.add(low)
                cleaned_domains.append(d)
        if not cleaned_domains:
            raise HTTPException(status_code=400, detail="At least one valid domain is required")

    cleaned_criteria = None
    if criteria is not None:
        if not criteria:
            raise HTTPException(status_code=400, detail="At least one judging criterion is required")
        total_weight = sum(c.weight if hasattr(c, "weight") else c["weight"] for c in criteria)
        if total_weight != 100:
            raise HTTPException(
                status_code=400,
                detail=f"Judging criteria weights must total 100, got {total_weight}",
            )
        cleaned_criteria = criteria

    return cleaned_domains, cleaned_criteria


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


ALLOWED_SORTS = {
    "start_date": Hackathon.start_date,
    "registration_deadline": Hackathon.registration_deadline,
    "name": Hackathon.name,
    "created_at": Hackathon.created_at,
}


@router.get("/hackathons", response_model=list[HackathonListItem])
def list_hackathons(
    response: Response,
    q: str | None = None,
    domain: str | None = None,
    status: HackathonStatus | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    sort_by: str = "start_date",
    order: str = "desc",
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    """
    List hackathons with search, filtering, sorting, and pagination.
    from_date and to_date filter on hackathon start_date.
    Total matching count is returned in the X-Total-Count response header.
    """
    if sort_by not in ALLOWED_SORTS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid sort_by field '{sort_by}'. Allowed fields: {list(ALLOWED_SORTS.keys())}",
        )
    order_norm = order.lower().strip()
    if order_norm not in {"asc", "desc"}:
        raise HTTPException(status_code=422, detail="Invalid order. Allowed values: 'asc', 'desc'")

    stmt = select(Hackathon)
    is_admin = user is not None and user.role.value == "admin"
    if not is_admin:
        visible = [HackathonStatus.published, HackathonStatus.active, HackathonStatus.completed]
        if status:
            if status not in visible:
                response.headers["X-Total-Count"] = "0"
                response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"
                return []
            stmt = stmt.where(Hackathon.status == status)
        else:
            stmt = stmt.where(Hackathon.status.in_(visible))
    elif status:
        stmt = stmt.where(Hackathon.status == status)

    if q:
        like = f"%{q.strip()}%"
        domain_match = select(1).where(
            HackathonDomain.hackathon_id == Hackathon.id,
            HackathonDomain.domain.ilike(like),
        ).exists()
        stmt = stmt.where(
            or_(
                Hackathon.name.ilike(like),
                Hackathon.short_description.ilike(like),
                domain_match,
            )
        )

    if domain:
        stmt = stmt.where(
            select(1).where(
                HackathonDomain.hackathon_id == Hackathon.id,
                HackathonDomain.domain.ilike(domain.strip()),
            ).exists()
        )

    if from_date:
        stmt = stmt.where(Hackathon.start_date >= from_date)
    if to_date:
        stmt = stmt.where(Hackathon.start_date <= to_date)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = db.scalar(count_stmt) or 0
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    sort_col = ALLOWED_SORTS[sort_by]
    order_expr = sort_col.asc() if order_norm == "asc" else sort_col.desc()

    paged_stmt = (
        stmt.options(selectinload(Hackathon.domains), selectinload(Hackathon.teams))
        .order_by(order_expr)
        .offset(max(skip, 0))
        .limit(max(limit, 1))
    )
    hackathons = db.scalars(paged_stmt).all()

    if hackathons:
        h_ids = [h.id for h in hackathons]
        problem_counts_query = (
            select(HackathonProblem.hackathon_id, func.count(HackathonProblem.id))
            .where(
                HackathonProblem.hackathon_id.in_(h_ids),
                HackathonProblem.is_published == True,
            )
            .group_by(HackathonProblem.hackathon_id)
        )
        problem_counts_map = dict(db.execute(problem_counts_query).all())
    else:
        problem_counts_map = {}

    results: list[HackathonListItem] = []
    for h in hackathons:
        results.append(
            HackathonListItem(
                id=h.id,
                name=h.name,
                slug=h.slug,
                short_description=h.short_description,
                banner_url=h.banner_url,
                organizer=h.organizer,
                start_date=h.start_date,
                end_date=h.end_date,
                registration_deadline=h.registration_deadline,
                location=h.location,
                team_size_min=h.team_size_min,
                team_size_max=h.team_size_max,
                status=h.status,
                domains=[d.domain for d in h.domains],
                problem_count=problem_counts_map.get(h.id, 0),
                team_count=len(h.teams),
            )
        )
    return results


@router.get("/hackathons/{hackathon_id}", response_model=HackathonOut)
def get_hackathon(hackathon_id: UUID, db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    item = _get_hackathon(db, hackathon_id)
    is_admin = user is not None and user.role.value == "admin"
    if not is_admin and item.status in {HackathonStatus.draft, HackathonStatus.archived}:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return serialize_hackathon(item)


@router.post("/hackathons", response_model=HackathonOut, status_code=201)
def create_hackathon(payload: HackathonCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    cleaned_domains, cleaned_criteria = validate_hackathon_fields(
        team_size_min=payload.team_size_min,
        team_size_max=payload.team_size_max,
        start_date=payload.start_date,
        end_date=payload.end_date,
        registration_deadline=payload.registration_deadline,
        domains=payload.domains,
        criteria=payload.criteria,
    )
    if payload.status == HackathonStatus.active:
        raise HTTPException(
            status_code=400,
            detail="Cannot activate hackathon without at least one published problem",
        )

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
        domains=[HackathonDomain(domain=d) for d in (cleaned_domains or [])],
        criteria=[
            JudgingCriterion(title=c.title, description=c.description, weight=c.weight)
            for c in (cleaned_criteria or [])
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

    domains_in = data.get("domains")
    criteria_in = data.get("criteria")
    target_status = data.get("status")

    # Compute effective values
    eff_size_min = data.get("team_size_min", item.team_size_min)
    eff_size_max = data.get("team_size_max", item.team_size_max)
    eff_start = data.get("start_date", item.start_date)
    eff_end = data.get("end_date", item.end_date)
    eff_reg = data.get("registration_deadline", item.registration_deadline)

    # 1. Validate fields on effective values BEFORE changing anything
    cleaned_domains, cleaned_criteria = validate_hackathon_fields(
        team_size_min=eff_size_min,
        team_size_max=eff_size_max,
        start_date=eff_start,
        end_date=eff_end,
        registration_deadline=eff_reg,
        domains=domains_in,
        criteria=criteria_in,
    )

    # 2. Check team size shrinkage protection
    if "team_size_max" in data:
        largest_size = 0
        for t in item.teams:
            active_m = len([m for m in t.members if m.status == MemberStatus.active])
            if active_m > largest_size:
                largest_size = active_m
        if eff_size_max < largest_size:
            raise HTTPException(
                status_code=409,
                detail=f"Cannot reduce maximum team size to {eff_size_max}. Largest existing team has {largest_size} active members.",
            )

    # 3. Check status transition if status is being updated
    if target_status is not None:
        eff_criteria = cleaned_criteria if cleaned_criteria is not None else item.criteria
        validate_status_transition(item.status, target_status, item, eff_criteria)

    # ALL validations passed! Apply updates
    name = data.get("name")
    if name and name != item.name:
        item.slug = unique_slug(db, name)

    data.pop("domains", None)
    data.pop("criteria", None)
    for key, value in data.items():
        setattr(item, key, value)

    if cleaned_domains is not None:
        item.domains.clear()
        db.flush()
        item.domains = [HackathonDomain(domain=d) for d in cleaned_domains]

    if cleaned_criteria is not None:
        item.criteria.clear()
        db.flush()
        item.criteria = [
            JudgingCriterion(title=c["title"], description=c["description"], weight=c["weight"])
            for c in cleaned_criteria
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
    validate_status_transition(item.status, payload.status, item)
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
    dup = db.scalar(
        select(HackathonProblem).where(
            HackathonProblem.hackathon_id == hackathon_id,
            func.lower(HackathonProblem.code) == payload.code.strip().lower(),
        )
    )
    if dup:
        raise HTTPException(
            status_code=409,
            detail=f"Problem statement with code '{payload.code}' already exists in this hackathon",
        )
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
    problem = db.scalar(
        select(HackathonProblem)
        .options(
            selectinload(HackathonProblem.hackathon).selectinload(Hackathon.problems),
            selectinload(HackathonProblem.selections),
        )
        .where(HackathonProblem.id == problem_id)
    )
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    data = payload.model_dump(exclude_unset=True)
    new_code = data.get("code")
    if new_code and new_code.strip().lower() != problem.code.lower():
        dup = db.scalar(
            select(HackathonProblem).where(
                HackathonProblem.hackathon_id == problem.hackathon_id,
                HackathonProblem.id != problem.id,
                func.lower(HackathonProblem.code) == new_code.strip().lower(),
            )
        )
        if dup:
            raise HTTPException(
                status_code=409,
                detail=f"Problem statement with code '{new_code}' already exists in this hackathon",
            )

    new_is_pub = data.get("is_published")
    if new_is_pub is False and problem.is_published is True:
        if problem.selections:
            raise HTTPException(
                status_code=409,
                detail="Cannot unpublish a problem that teams have already selected",
            )
        if problem.hackathon and problem.hackathon.status == HackathonStatus.active:
            other_published = [p for p in problem.hackathon.problems if p.id != problem.id and p.is_published]
            if not other_published:
                raise HTTPException(
                    status_code=409,
                    detail="Cannot unpublish this problem because it would leave an active hackathon with no published problem",
                )

    for key, value in data.items():
        setattr(problem, key, value)
    db.commit()
    db.refresh(problem)
    return serialize_problem(problem)


@router.delete("/problems/{problem_id}", status_code=204)
def delete_problem(problem_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    problem = db.scalar(
        select(HackathonProblem)
        .options(
            selectinload(HackathonProblem.hackathon).selectinload(Hackathon.problems),
            selectinload(HackathonProblem.selections),
        )
        .where(HackathonProblem.id == problem_id)
    )
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    if problem.selections:
        raise HTTPException(status_code=409, detail="Cannot delete a problem that teams have already selected")
    if problem.hackathon and problem.hackathon.status == HackathonStatus.active and problem.is_published:
        other_published = [p for p in problem.hackathon.problems if p.id != problem.id and p.is_published]
        if not other_published:
            raise HTTPException(
                status_code=409,
                detail="Cannot delete this problem because it would leave an active hackathon with no published problem",
            )
    db.delete(problem)
    db.commit()
