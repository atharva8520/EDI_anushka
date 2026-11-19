from __future__ import annotations

from uuid import UUID
import pytest
from sqlalchemy import select

from app.models.ai import AIRun
from app.models.project import Project, Task
from app.models.team import Team, TeamMember
from tests.factories import auth_header, create_admin, create_student, make_hackathon


@pytest.fixture
def seeded_team(client):
    test_client, db = client
    # Create students
    leader = create_student(db, "leader_5b@test.dev", "Leader 5b")
    member = create_student(db, "member_5b@test.dev", "Member 5b")
    outsider = create_student(db, "outsider_5b@test.dev", "Outsider 5b")
    candidate = create_student(db, "cand_5b@test.dev", "Candidate 5b")

    # Create hackathon with problem
    hack = make_hackathon(db)
    from app.models.hackathon import HackathonProblem
    problem = HackathonProblem(
        hackathon_id=hack.id,
        code="AI-01",
        title="Automated Healthcare Dispatch",
        statement="City ambulances experience coordinate latency.",
        description="Build an intelligent routing triage prototype.",
        domain="Healthcare",
        target_users="Emergency dispatchers and paramedics",
        constraints="No external proprietary APIs, low-latency",
        expected_outcome="Working triage coordination prototype",
        evaluation_criteria="Architecture, speed, accuracy",
        required_technologies="Python, FastAPI, React",
    )
    db.add(problem)
    db.commit()

    # Create team & select problem
    team = Team(
        hackathon_id=hack.id,
        name="Apollo Squad",
        leader_id=leader.id,
        invite_code="APOLLO12",
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    from app.models.team import MemberStatus, TeamProblemSelection
    db.add_all([
        TeamMember(team_id=team.id, user_id=leader.id, member_role="Leader", status=MemberStatus.active),
        TeamMember(team_id=team.id, user_id=member.id, member_role="Dev", status=MemberStatus.active),
        TeamProblemSelection(team_id=team.id, problem_id=problem.id, selected_by=leader.id),
    ])
    db.commit()

    # Create project for team
    proj = Project(
        team_id=team.id,
        title="Apollo Dispatch System",
        summary="Dispatch dashboard",
        created_by=leader.id,
    )
    db.add(proj)
    db.commit()

    return {
        "client": test_client,
        "db": db,
        "team": team,
        "problem": problem,
        "leader": leader,
        "member": member,
        "outsider": outsider,
        "candidate": candidate,
        "project": proj,
    }


def test_explain_match_permissions(seeded_team):
    data = seeded_team
    client = data["client"]
    team = data["team"]
    cand = data["candidate"]

    # Anonymous -> 401
    res_anon = client.post(f"/api/ai/teams/{team.id}/explain-match", json={"candidate_id": str(cand.id)})
    assert res_anon.status_code == 401

    # Outsider -> 403
    out_hdr = auth_header(client, "outsider_5b@test.dev", "Student@123")
    res_out = client.post(f"/api/ai/teams/{team.id}/explain-match", json={"candidate_id": str(cand.id)}, headers=out_hdr)
    assert res_out.status_code == 403


def test_explain_match_success(seeded_team):
    data = seeded_team
    client = data["client"]
    db = data["db"]
    team = data["team"]
    cand = data["candidate"]
    ldr_hdr = auth_header(client, "leader_5b@test.dev", "Student@123")

    res = client.post(
        f"/api/ai/teams/{team.id}/explain-match",
        json={"candidate_id": str(cand.id)},
        headers=ldr_hdr,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["candidate_id"] == str(cand.id)
    assert len(body["rationale"]) > 20
    assert "5b" in body["rationale"] or "skill" in body["rationale"].lower()
    assert "run_id" in body

    # Verify AIRun record exists in DB
    run = db.get(AIRun, UUID(body["run_id"]))
    assert run is not None
    assert run.feature == "explain_match"
    assert run.team_id == team.id


def test_decompose_tasks_without_auto_create(seeded_team):
    data = seeded_team
    client = data["client"]
    db = data["db"]
    team = data["team"]
    ldr_hdr = auth_header(client, "leader_5b@test.dev", "Student@123")

    res = client.post(
        f"/api/ai/teams/{team.id}/decompose-tasks",
        json={"auto_create": False},
        headers=ldr_hdr,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["problem_title"] == "Automated Healthcare Dispatch"
    assert len(body["tasks"]) >= 3
    assert body["tasks_created"] == 0

    # Ensure no tasks were added to DB
    tasks_in_db = db.scalars(select(Task).where(Task.project_id == data["project"].id)).all()
    assert len(tasks_in_db) == 0


def test_decompose_tasks_with_auto_create(seeded_team):
    data = seeded_team
    client = data["client"]
    db = data["db"]
    team = data["team"]
    ldr_hdr = auth_header(client, "leader_5b@test.dev", "Student@123")

    res = client.post(
        f"/api/ai/teams/{team.id}/decompose-tasks",
        json={"auto_create": True},
        headers=ldr_hdr,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["tasks_created"] > 0

    # Verify tasks now exist in DB under team's project
    tasks_in_db = db.scalars(select(Task).where(Task.project_id == data["project"].id)).all()
    assert len(tasks_in_db) == body["tasks_created"]
    assert any("API" in t.title or "Setup" in t.title or "Dispatch" in t.title or "UI" in t.title for t in tasks_in_db)


def test_copilot_chat(seeded_team):
    data = seeded_team
    client = data["client"]
    db = data["db"]
    team = data["team"]
    ldr_hdr = auth_header(client, "leader_5b@test.dev", "Student@123")

    payload = {
        "message": "What architecture pattern should we use for ambulance routing?",
        "history": [],
    }

    res = client.post(
        f"/api/ai/teams/{team.id}/copilot-chat",
        json=payload,
        headers=ldr_hdr,
    )
    assert res.status_code == 200
    body = res.json()
    assert "reply" in body
    assert len(body["reply"]) > 10
    assert "run_id" in body

    # Verify AIRun was saved
    run = db.get(AIRun, UUID(body["run_id"]))
    assert run is not None
    assert run.feature == "copilot_chat"
    assert run.team_id == team.id
