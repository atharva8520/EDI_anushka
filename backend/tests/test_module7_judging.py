"""Tests for Module 7: Project Submissions, Judging Rubric, Scoring, and Leaderboard."""

from datetime import date, timedelta
import pytest
from app.models.hackathon import Hackathon, HackathonDomain, HackathonProblem, HackathonStatus, JudgingCriterion
from app.models.project import Project
from tests.factories import auth_header, create_admin, create_student, make_hackathon


def _setup_submission_env(db, test_client):
    lead = create_student(db, "lead_m7@test.dev", "Lead M7")
    member = create_student(db, "member_m7@test.dev", "Member M7")
    outsider = create_student(db, "outsider_m7@test.dev", "Outsider M7")
    admin = create_admin(db)

    today = date.today()
    h = Hackathon(
        name="M7 Hackathon",
        slug="m7-hackathon",
        description="Hackathon for testing Module 7 submissions and judging.",
        short_description="Short description",
        organizer="HackOrg",
        start_date=today + timedelta(days=1),
        end_date=today + timedelta(days=3),
        registration_deadline=today + timedelta(days=1),
        location="Online",
        team_size_min=1,
        team_size_max=4,
        rules="Rules",
        status=HackathonStatus.published,
        domains=[HackathonDomain(domain="AI")],
        criteria=[
            JudgingCriterion(title="Innovation", description="Originality", weight=40),
            JudgingCriterion(title="Execution", description="Technical quality", weight=60),
        ],
        problems=[
            HackathonProblem(
                code="P-701",
                title="AI Copilot Challenge",
                statement="Build an AI copilot",
                description="Copilot description",
                domain="AI",
                target_users="Devs",
                constraints="Fast",
                expected_outcome="MVP",
                evaluation_criteria="Quality",
            )
        ],
    )
    db.add(h)
    db.commit()
    db.refresh(h)

    h_lead = auth_header(test_client, "lead_m7@test.dev", "Student@123")
    h_member = auth_header(test_client, "member_m7@test.dev", "Student@123")
    h_outsider = auth_header(test_client, "outsider_m7@test.dev", "Student@123")
    h_admin = auth_header(test_client, "admin@test.dev", "Admin@12345")

    # Lead creates team
    c = test_client.post(
        "/api/teams",
        headers=h_lead,
        json={"hackathon_id": str(h.id), "name": "M7 Alpha Squad", "member_role": "Lead"},
    )
    assert c.status_code == 201
    team_data = c.json()
    team_id = team_data["id"]

    # Member joins
    test_client.post(
        "/api/teams/join",
        headers=h_member,
        json={"invite_code": team_data["invite_code"], "member_role": "Engineer"},
    )

    # Lead selects problem
    prob_id = str(h.problems[0].id)
    test_client.post(
        f"/api/teams/{team_id}/problem",
        headers=h_lead,
        json={"problem_id": prob_id},
    )

    # Create workspace project
    p_res = test_client.post(
        f"/api/teams/{team_id}/project",
        headers=h_lead,
        json={"title": "Alpha Project", "summary": "AI assistant prototype"},
    )
    assert p_res.status_code == 201
    proj_id = p_res.json()["id"]

    return {
        "hackathon": h,
        "team_id": team_id,
        "project_id": proj_id,
        "lead": lead,
        "member": member,
        "outsider": outsider,
        "admin": admin,
        "h_lead": h_lead,
        "h_member": h_member,
        "h_outsider": h_outsider,
        "h_admin": h_admin,
    }


def test_submit_project_lifecycle(client):
    test_client, db = client
    env = _setup_submission_env(db, test_client)
    proj_id = env["project_id"]

    # 1. Initial submission state is false
    res0 = test_client.get(f"/api/projects/{proj_id}/submission", headers=env["h_lead"])
    assert res0.status_code == 200
    sub0 = res0.json()
    assert sub0["is_submitted"] is False
    assert sub0["submitted_at"] is None

    # 2. Member or Lead submits project
    payload = {
        "repo_url": "https://github.com/hacknova/alpha-squad",
        "demo_url": "https://alpha.hacknova.dev",
        "video_url": "https://loom.com/share/alpha-demo",
        "pitch_deck_url": "https://docs.google.com/presentation/d/alpha",
        "tech_stack": ["FastAPI", "React", "PostgreSQL", "Groq"],
        "submission_notes": "We implemented real-time LLM suggestions and full test suite.",
    }
    submit_res = test_client.post(f"/api/projects/{proj_id}/submit", headers=env["h_lead"], json=payload)
    assert submit_res.status_code == 200, submit_res.text
    data = submit_res.json()
    assert data["is_submitted"] is True
    assert data["repo_url"] == payload["repo_url"]
    assert data["demo_url"] == payload["demo_url"]
    assert data["video_url"] == payload["video_url"]
    assert "FastAPI" in data["tech_stack"]
    assert data["submitted_at"] is not None
    assert data["submitted_by"] == str(env["lead"].id)

    # 3. Retrieve submission details
    get_res = test_client.get(f"/api/projects/{proj_id}/submission", headers=env["h_member"])
    assert get_res.status_code == 200
    assert get_res.json()["is_submitted"] is True


def test_outsider_cannot_submit_project(client):
    test_client, db = client
    env = _setup_submission_env(db, test_client)
    proj_id = env["project_id"]

    payload = {
        "repo_url": "https://github.com/hacknova/alpha-squad",
    }
    res = test_client.post(f"/api/projects/{proj_id}/submit", headers=env["h_outsider"], json=payload)
    assert res.status_code == 403


def test_cannot_evaluate_unsubmitted_project(client):
    test_client, db = client
    env = _setup_submission_env(db, test_client)
    proj_id = env["project_id"]
    crit = env["hackathon"].criteria

    eval_payload = {
        "feedback": "Great initial ideas",
        "scores": [
            {"criterion_id": str(crit[0].id), "score": 8.0},
            {"criterion_id": str(crit[1].id), "score": 9.0},
        ],
    }
    res = test_client.post(f"/api/projects/{proj_id}/evaluations", headers=env["h_admin"], json=eval_payload)
    assert res.status_code == 400
    assert "not been submitted" in res.json()["detail"].lower()


def test_admin_judging_evaluation(client):
    test_client, db = client
    env = _setup_submission_env(db, test_client)
    proj_id = env["project_id"]
    crit = env["hackathon"].criteria

    # Lead submits project
    test_client.post(
        f"/api/projects/{proj_id}/submit",
        headers=env["h_lead"],
        json={"repo_url": "https://github.com/hacknova/alpha"},
    )

    # Student cannot judge
    student_eval = test_client.post(
        f"/api/projects/{proj_id}/evaluations",
        headers=env["h_lead"],
        json={"scores": [{"criterion_id": str(crit[0].id), "score": 8.0}]},
    )
    assert student_eval.status_code == 403

    # Admin judges project
    # crit[0] weight=40, score=8.0 -> 320
    # crit[1] weight=60, score=9.0 -> 540
    # total weighted = (320 + 540) / 100 * 10 = 86.0
    eval_payload = {
        "feedback": "Outstanding execution and solid architecture.",
        "scores": [
            {"criterion_id": str(crit[0].id), "score": 8.0, "notes": "Solid innovation"},
            {"criterion_id": str(crit[1].id), "score": 9.0, "notes": "Impressed with test coverage"},
        ],
    }
    eval_res = test_client.post(f"/api/projects/{proj_id}/evaluations", headers=env["h_admin"], json=eval_payload)
    assert eval_res.status_code == 200, eval_res.text
    eval_data = eval_res.json()
    assert eval_data["total_score"] == 86.0
    assert len(eval_data["scores"]) == 2
    assert eval_data["judge_name"] == "Admin"

    # Fetch evaluations list
    list_res = test_client.get(f"/api/projects/{proj_id}/evaluations", headers=env["h_lead"])
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["total_score"] == 86.0


def test_leaderboard_and_rankings(client):
    test_client, db = client
    env = _setup_submission_env(db, test_client)
    h = env["hackathon"]
    crit = h.criteria
    proj_1_id = env["project_id"]

    # Create Team 2 and Project 2
    user_b = create_student(db, "lead_b@test.dev", "Lead Beta")
    h_b = auth_header(test_client, "lead_b@test.dev", "Student@123")
    t2 = test_client.post(
        "/api/teams",
        headers=h_b,
        json={"hackathon_id": str(h.id), "name": "Beta Squad", "member_role": "Lead"},
    ).json()
    test_client.post(f"/api/teams/{t2['id']}/problem", headers=h_b, json={"problem_id": str(h.problems[0].id)})
    p2 = test_client.post(f"/api/teams/{t2['id']}/project", headers=h_b, json={"title": "Beta Project"}).json()
    proj_2_id = p2["id"]

    # Submit both projects
    test_client.post(
        f"/api/projects/{proj_1_id}/submit",
        headers=env["h_lead"],
        json={"repo_url": "https://github.com/hacknova/p1", "demo_url": "https://p1.demo"},
    )
    test_client.post(
        f"/api/projects/{proj_2_id}/submit",
        headers=h_b,
        json={"repo_url": "https://github.com/hacknova/p2", "demo_url": "https://p2.demo"},
    )

    # Score Project 1: (8*40 + 9*60)/100 * 10 = 86.0
    test_client.post(
        f"/api/projects/{proj_1_id}/evaluations",
        headers=env["h_admin"],
        json={
            "feedback": "Project 1 feedback",
            "scores": [
                {"criterion_id": str(crit[0].id), "score": 8.0},
                {"criterion_id": str(crit[1].id), "score": 9.0},
            ],
        },
    )

    # Score Project 2: (6*40 + 7*60)/100 * 10 = 66.0
    test_client.post(
        f"/api/projects/{proj_2_id}/evaluations",
        headers=env["h_admin"],
        json={
            "feedback": "Project 2 feedback",
            "scores": [
                {"criterion_id": str(crit[0].id), "score": 6.0},
                {"criterion_id": str(crit[1].id), "score": 7.0},
            ],
        },
    )

    # Fetch Leaderboard
    lb_res = test_client.get(f"/api/hackathons/{h.id}/leaderboard")
    assert lb_res.status_code == 200, lb_res.text
    items = lb_res.json()
    assert len(items) == 2

    # Project 1 should be rank 1
    assert items[0]["project_id"] == proj_1_id
    assert items[0]["rank"] == 1
    assert items[0]["average_score"] == 86.0
    assert "1st Place" in (items[0]["badge"] or "")

    # Project 2 should be rank 2
    assert items[1]["project_id"] == proj_2_id
    assert items[1]["rank"] == 2
    assert items[1]["average_score"] == 66.0
    assert "2nd Place" in (items[1]["badge"] or "")

    # Admin submissions view
    sub_res = test_client.get(f"/api/hackathons/{h.id}/submissions", headers=env["h_admin"])
    assert sub_res.status_code == 200
    assert len(sub_res.json()) == 2
