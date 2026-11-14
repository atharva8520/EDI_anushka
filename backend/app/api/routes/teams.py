from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, require_admin
from app.database.session import get_db
from app.models.hackathon import Hackathon, HackathonProblem, HackathonStatus
from app.models.profile import UserSkill
from app.models.project import Project, Task
from app.models.team import InviteStatus, MemberStatus, Team, TeamInvite, TeamMember, TeamProblemSelection
from app.models.user import User, UserRole
from app.schemas.team import (
    InviteCreate,
    InviteOut,
    MemberRoleUpdate,
    ProblemSelect,
    TeamCreate,
    TeamInviteLeaderOut,
    TeamJoin,
    TeamOut,
    TeamTransferLeadership,
    TeamWorkspaceOut,
)
from app.services.ids import generate_invite_code
from app.services.project_service import unassign_member_tasks
from app.services.serializers import serialize_team
from app.services.team_service import team_skill_map

router = APIRouter(tags=["teams"])

TEAM_LOAD = (
    selectinload(Team.hackathon),
    selectinload(Team.leader),
    selectinload(Team.problem_selection).selectinload(TeamProblemSelection.problem),
    selectinload(Team.members).selectinload(TeamMember.user).selectinload(User.skills).selectinload(UserSkill.skill),
    selectinload(Team.members).selectinload(TeamMember.user).selectinload(User.preferred_roles),
    selectinload(Team.members).selectinload(TeamMember.user).selectinload(User.profile),
    selectinload(Team.project).selectinload(Project.tasks),
)


def _load_team(db: Session, team_id: UUID) -> Team:
    team = db.scalar(select(Team).options(*TEAM_LOAD).where(Team.id == team_id))
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


def _has_active_leader(team: Team) -> bool:
    return any(m.user_id == team.leader_id and m.status == MemberStatus.active for m in team.members)


@router.get("/teams/mine", response_model=TeamWorkspaceOut | None)
def my_team(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.scalar(
        select(TeamMember).where(TeamMember.user_id == user.id, TeamMember.status == MemberStatus.active)
    )
    if not membership:
        return None
    team = _load_team(db, membership.team_id)
    skill_map, missing = team_skill_map(team)
    return TeamWorkspaceOut(team=serialize_team(team, user.id), skill_map=skill_map, missing_capabilities=missing)


@router.get("/teams/{team_id}", response_model=TeamOut)
def get_team(team_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = _load_team(db, team_id)
    is_member = any(m.user_id == user.id and m.status == MemberStatus.active for m in team.members)
    if not is_member and user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
    return serialize_team(team, user.id)


@router.post("/teams", response_model=TeamOut, status_code=201)
def create_team(payload: TeamCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can create teams")
    existing = db.scalar(
        select(TeamMember).where(TeamMember.user_id == user.id, TeamMember.status == MemberStatus.active)
    )
    if existing:
        raise HTTPException(status_code=409, detail="You already belong to a team. Leave it before creating another.")
    hackathon = db.get(Hackathon, payload.hackathon_id)
    if not hackathon or hackathon.status not in {HackathonStatus.published, HackathonStatus.active}:
        raise HTTPException(status_code=400, detail="You can only create teams for published or active hackathons")
    if date.today() > hackathon.registration_deadline:
        raise HTTPException(status_code=400, detail="Registration has closed for this hackathon")

    clean_name = payload.name.strip()
    if len(clean_name) < 2:
        raise HTTPException(status_code=422, detail="Team name must be at least 2 characters")

    duplicate = db.scalar(
        select(Team).where(Team.hackathon_id == payload.hackathon_id, func.lower(Team.name) == clean_name.lower())
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="A team with this name already exists in the hackathon")

    team = Team(
        hackathon_id=payload.hackathon_id,
        name=clean_name,
        invite_code=generate_invite_code(db),
        leader_id=user.id,
        members=[TeamMember(user_id=user.id, member_role=payload.member_role, status=MemberStatus.active)],
    )
    db.add(team)
    db.commit()
    return serialize_team(_load_team(db, team.id), user.id)


@router.post("/teams/join", response_model=TeamOut)
def join_team(payload: TeamJoin, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can join teams")
    existing = db.scalar(
        select(TeamMember).where(TeamMember.user_id == user.id, TeamMember.status == MemberStatus.active)
    )
    if existing:
        raise HTTPException(status_code=409, detail="You already belong to a team")

    team = db.scalar(select(Team).options(*TEAM_LOAD).where(Team.invite_code == payload.invite_code.upper()))
    if not team:
        raise HTTPException(status_code=404, detail="Invite code is not valid")

    if team.hackathon.status not in {HackathonStatus.published, HackathonStatus.active}:
        raise HTTPException(status_code=400, detail="You can only join teams for published or active hackathons")

    if not _has_active_leader(team):
        raise HTTPException(status_code=400, detail="This team is no longer active")

    active_count = len([m for m in team.members if m.status == MemberStatus.active])
    if active_count >= team.hackathon.team_size_max:
        raise HTTPException(status_code=409, detail="This team is already at maximum size")

    leftover = next((m for m in team.members if m.user_id == user.id), None)
    if leftover:
        leftover.status = MemberStatus.active
        leftover.member_role = payload.member_role
    else:
        db.add(TeamMember(team_id=team.id, user_id=user.id, member_role=payload.member_role, status=MemberStatus.active))
    db.commit()
    return serialize_team(_load_team(db, team.id), user.id)


@router.post("/teams/{team_id}/leave")
def leave_team(team_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = _load_team(db, team_id)
    member = next((m for m in team.members if m.user_id == user.id and m.status == MemberStatus.active), None)
    if not member:
        raise HTTPException(status_code=404, detail="You are not in this team")

    active_members = [m for m in team.members if m.status == MemberStatus.active]
    if team.leader_id == user.id:
        others = [m for m in active_members if m.user_id != user.id]
        if others:
            raise HTTPException(
                status_code=409,
                detail="Transfer leadership or wait until other members leave before leaving as team lead",
            )
        # Leader leaving as the last active member: delete the team
        db.delete(team)
        db.commit()
        return {"ok": True, "deleted": True}

    member.status = MemberStatus.left
    unassign_member_tasks(db, team, user.id, actor_id=user.id)
    db.commit()
    return {"ok": True}


@router.post("/teams/{team_id}/members/{member_id}/remove", response_model=TeamOut)
def remove_member(
    team_id: UUID,
    member_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = _load_team(db, team_id)
    if team.leader_id != user.id:
        raise HTTPException(status_code=403, detail="Only the team lead can remove members")

    member = next((m for m in team.members if m.id == member_id and m.status == MemberStatus.active), None)
    if not member:
        raise HTTPException(status_code=404, detail="Active member not found")

    if member.user_id == team.leader_id:
        raise HTTPException(status_code=400, detail="Cannot remove the team lead")

    member.status = MemberStatus.left
    unassign_member_tasks(db, team, member.user_id, actor_id=user.id)
    db.commit()
    return serialize_team(_load_team(db, team.id), user.id)


@router.post("/teams/{team_id}/transfer-leadership", response_model=TeamOut)
def transfer_leadership(
    team_id: UUID,
    payload: TeamTransferLeadership,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = _load_team(db, team_id)
    if team.leader_id != user.id:
        raise HTTPException(status_code=403, detail="Only the team lead can transfer leadership")

    target = next((m for m in team.members if m.id == payload.member_id and m.status == MemberStatus.active), None)
    if not target:
        raise HTTPException(status_code=404, detail="Active member not found")

    if target.user_id == user.id:
        raise HTTPException(status_code=400, detail="You are already the team lead")

    old_leader_mem = next((m for m in team.members if m.user_id == user.id and m.status == MemberStatus.active), None)
    if old_leader_mem and old_leader_mem.member_role == "Team Lead":
        old_leader_mem.member_role = "Member"

    target.member_role = "Team Lead"
    team.leader_id = target.user_id
    db.commit()
    return serialize_team(_load_team(db, team.id), user.id)


@router.post("/teams/{team_id}/members/{member_id}/role", response_model=TeamOut)
def update_role(
    team_id: UUID,
    member_id: UUID,
    payload: MemberRoleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = _load_team(db, team_id)
    if team.leader_id != user.id:
        raise HTTPException(status_code=403, detail="Only the team lead can update roles")
    member = next((m for m in team.members if m.id == member_id and m.status == MemberStatus.active), None)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.member_role = payload.member_role
    db.commit()
    return serialize_team(_load_team(db, team.id), user.id)


@router.post("/teams/{team_id}/problem", response_model=TeamOut)
def select_problem(
    team_id: UUID,
    payload: ProblemSelect,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = _load_team(db, team_id)
    if team.leader_id != user.id:
        raise HTTPException(status_code=403, detail="Only the team leader can select a problem")
    problem = db.get(HackathonProblem, payload.problem_id)
    if not problem or problem.hackathon_id != team.hackathon_id or not problem.is_published:
        raise HTTPException(status_code=400, detail="Problem is not available for this hackathon")
    if team.problem_selection:
        team.problem_selection.problem_id = problem.id
        team.problem_selection.selected_by = user.id
    else:
        db.add(TeamProblemSelection(team_id=team.id, problem_id=problem.id, selected_by=user.id))
    db.commit()
    return serialize_team(_load_team(db, team.id), user.id)


@router.post("/teams/{team_id}/invites", status_code=201)
def invite_member(
    team_id: UUID,
    payload: InviteCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = _load_team(db, team_id)
    if team.leader_id != user.id:
        raise HTTPException(status_code=403, detail="Only the team lead can invite members")

    if team.hackathon.status not in {HackathonStatus.published, HackathonStatus.active}:
        raise HTTPException(status_code=400, detail="Team hackathon is not accepting new members")

    active_count = len([m for m in team.members if m.status == MemberStatus.active])
    if active_count >= team.hackathon.team_size_max:
        raise HTTPException(status_code=409, detail="This team is already at maximum size")

    if payload.invitee_id is not None:
        invitee = db.get(User, payload.invitee_id)
        if not invitee or invitee.role != UserRole.student:
            raise HTTPException(status_code=404, detail="No student account found with that id")
    else:
        invitee = db.scalar(select(User).where(User.email == payload.email.lower(), User.role == UserRole.student))
        if not invitee:
            raise HTTPException(status_code=404, detail="No student account found with that email")

    if invitee.id == user.id:
        raise HTTPException(status_code=400, detail="You are already on the team")

    already = any(m.user_id == invitee.id and m.status == MemberStatus.active for m in team.members)
    if already:
        raise HTTPException(status_code=409, detail="That student is already on the team")

    other_team_member = db.scalar(
        select(TeamMember).where(TeamMember.user_id == invitee.id, TeamMember.status == MemberStatus.active)
    )
    if other_team_member:
        raise HTTPException(status_code=409, detail="That student already belongs to an active team")

    existing = db.scalar(
        select(TeamInvite).where(
            TeamInvite.team_id == team.id,
            TeamInvite.invitee_id == invitee.id,
        )
    )
    if existing:
        if existing.status == InviteStatus.pending:
            return {"id": str(existing.id), "status": existing.status.value, "invite_code": team.invite_code}
        existing.status = InviteStatus.pending
        existing.inviter_id = user.id
        existing.created_at = datetime.now(timezone.utc)
        db.commit()
        return {"id": str(existing.id), "status": existing.status.value, "invite_code": team.invite_code}

    invite = TeamInvite(team_id=team.id, inviter_id=user.id, invitee_id=invitee.id)
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return {"id": str(invite.id), "status": invite.status.value, "invite_code": team.invite_code}


@router.get("/teams/{team_id}/invites", response_model=list[TeamInviteLeaderOut])
def list_team_invites(
    team_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = _load_team(db, team_id)
    if team.leader_id != user.id:
        raise HTTPException(status_code=403, detail="Only the team lead can view team invites")

    invites = db.scalars(
        select(TeamInvite)
        .options(selectinload(TeamInvite.invitee))
        .where(TeamInvite.team_id == team.id, TeamInvite.status == InviteStatus.pending)
        .order_by(TeamInvite.created_at.desc())
    ).all()

    return [
        TeamInviteLeaderOut(
            id=i.id,
            team_id=i.team_id,
            invitee_id=i.invitee_id,
            invitee_name=i.invitee.full_name,
            status=i.status,
            created_at=i.created_at,
        )
        for i in invites
    ]


@router.get("/invites", response_model=list[InviteOut])
def my_invites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    invites = db.scalars(
        select(TeamInvite)
        .options(selectinload(TeamInvite.team).selectinload(Team.hackathon))
        .where(TeamInvite.invitee_id == user.id, TeamInvite.status == InviteStatus.pending)
        .order_by(TeamInvite.created_at.desc())
    ).all()
    return [
        InviteOut(
            id=i.id,
            team_id=i.team_id,
            team_name=i.team.name,
            hackathon_name=i.team.hackathon.name,
            status=i.status,
            created_at=i.created_at,
        )
        for i in invites
    ]


@router.post("/invites/{invite_id}/respond", response_model=TeamOut | None)
def respond_invite(
    invite_id: UUID,
    accept: bool = True,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invite = db.get(TeamInvite, invite_id)
    if not invite or invite.invitee_id != user.id:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.status != InviteStatus.pending:
        raise HTTPException(status_code=409, detail="Invite already resolved")

    if not accept:
        invite.status = InviteStatus.declined
        db.commit()
        return None

    team = _load_team(db, invite.team_id)

    if not _has_active_leader(team):
        raise HTTPException(status_code=400, detail="This team is no longer active")

    active_count = len([m for m in team.members if m.status == MemberStatus.active])
    if active_count >= team.hackathon.team_size_max:
        raise HTTPException(status_code=409, detail="This team is already at maximum size")

    existing = db.scalar(
        select(TeamMember).where(TeamMember.user_id == user.id, TeamMember.status == MemberStatus.active)
    )
    if existing:
        raise HTTPException(status_code=409, detail="Leave your current team before accepting another invite")

    invite.status = InviteStatus.accepted
    leftover = next((m for m in team.members if m.user_id == user.id), None)
    if leftover:
        leftover.status = MemberStatus.active
        leftover.member_role = "Member"
    else:
        db.add(TeamMember(team_id=invite.team_id, user_id=user.id, member_role="Member", status=MemberStatus.active))

    db.commit()
    return serialize_team(_load_team(db, invite.team_id), user.id)
