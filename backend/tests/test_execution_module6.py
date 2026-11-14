from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select
from app.models.hackathon import HackathonProblem
from app.models.project import ActivityLog, ChecklistItem, Milestone, Project, ProjectNote, Task, TaskPriority, TaskStatus
from app.models.team import MemberStatus, Team, TeamMember, TeamProblemSelection
from tests.factories import auth_header, create_admin, create_student, make_hackathon


def _setup_workspace_env(db, test_client):
    lead = create_student(db, "lead_m6@test.dev", "Lead M6")
    member = create_student(db, "member_m6@test.dev", "Member M6")
    outsider = create_student(db, "outsider_m6@test.dev", "Outsider M6")
    admin = create_admin(db)
    hackathon = make_hackathon(db)

    h_lead = auth_header(test_client, "lead_m6@test.dev", "Student@123")
    h_member = auth_header(test_client, "member_m6@test.dev", "Student@123")
    h_outsider = auth_header(test_client, "outsider_m6@test.dev", "Student@123")
    h_admin = auth_header(test_client, "admin@test.dev", "Admin@12345")

    # Lead creates team
    c = test_client.post(
        "/api/teams",
        headers=h_lead,
        json={"hackathon_id": str(hackathon.id), "name": "Execution Squad", "member_role": "Team Lead"},
    )
    assert c.status_code == 201
    team_data = c.json()
    team_id = team_data["id"]

    # Member joins
    j = test_client.post(
        "/api/teams/join",
        headers=h_member,
        json={"invite_code": team_data["invite_code"], "member_role": "Member"},
    )
    assert j.status_code == 200

    # Lead selects problem
    prob_id = str(hackathon.problems[0].id)
    p_sel = test_client.post(
        f"/api/teams/{team_id}/problem",
        headers=h_lead,
        json={"problem_id": prob_id},
    )
    assert p_sel.status_code == 200

    # Lead creates project
    p_proj = test_client.post(
        f"/api/teams/{team_id}/project",
        headers=h_lead,
        json={"title": "HackNova Core Project", "summary": "Project workspace for HackNova"},
    )
    assert p_proj.status_code == 201
    proj_data = p_proj.json()
    project_id = proj_data["id"]

    return {
        "lead": lead,
        "member": member,
        "outsider": outsider,
        "admin": admin,
        "hackathon": hackathon,
        "team_id": team_id,
        "project_id": project_id,
        "prob_id": prob_id,
        "h_lead": h_lead,
        "h_member": h_member,
        "h_outsider": h_outsider,
        "h_admin": h_admin,
    }


def test_auth_and_outsider_protection_on_all_new_endpoints(client):
    test_client, db = client
    env = _setup_workspace_env(db, test_client)
    pid = env["project_id"]

    # Create a note and checklist item as lead to test item endpoints
    note_res = test_client.post(f"/api/projects/{pid}/notes", headers=env["h_lead"], json={"title": "Init Note", "body": "Body"})
    assert note_res.status_code == 201
    note_id = note_res.json()["id"]

    item_res = test_client.post(f"/api/projects/{pid}/checklist", headers=env["h_lead"], json={"title": "Init Item"})
    assert item_res.status_code == 201
    item_id = item_res.json()["id"]

    endpoints = [
        ("PATCH", f"/api/projects/{pid}", {"summary": "New summary"}),
        ("GET", f"/api/projects/{pid}/notes", None),
        ("POST", f"/api/projects/{pid}/notes", {"title": "Test", "body": "Body"}),
        ("GET", f"/api/notes/{note_id}", None),
        ("PATCH", f"/api/notes/{note_id}", {"title": "Updated"}),
        ("DELETE", f"/api/notes/{note_id}", None),
        ("GET", f"/api/projects/{pid}/checklist", None),
        ("POST", f"/api/projects/{pid}/checklist", {"title": "Check"}),
        ("POST", f"/api/projects/{pid}/checklist/defaults", None),
        ("PATCH", f"/api/checklist/{item_id}", {"title": "T"}),
        ("DELETE", f"/api/checklist/{item_id}", None),
    ]

    for method, path, payload in endpoints:
        # Anonymous -> 401
        res_anon = test_client.request(method, path, json=payload)
        assert res_anon.status_code == 401, f"Expected 401 for anon on {method} {path}, got {res_anon.status_code}"

        # Outsider -> 403
        res_out = test_client.request(method, path, headers=env["h_outsider"], json=payload)
        assert res_out.status_code == 403, f"Expected 403 for outsider on {method} {path}, got {res_out.status_code}"


def test_admin_read_only_on_execution_endpoints(client):
    test_client, db = client
    env = _setup_workspace_env(db, test_client)
    pid = env["project_id"]

    note_res = test_client.post(f"/api/projects/{pid}/notes", headers=env["h_lead"], json={"title": "Admin Note", "body": "Body"})
    note_id = note_res.json()["id"]

    item_res = test_client.post(f"/api/projects/{pid}/checklist", headers=env["h_lead"], json={"title": "Admin Item"})
    item_id = item_res.json()["id"]

    # Admin read allowed (200)
    assert test_client.get(f"/api/projects/{pid}/notes", headers=env["h_admin"]).status_code == 200
    assert test_client.get(f"/api/notes/{note_id}", headers=env["h_admin"]).status_code == 200
    assert test_client.get(f"/api/projects/{pid}/checklist", headers=env["h_admin"]).status_code == 200

    # Admin write forbidden (403)
    assert test_client.patch(f"/api/projects/{pid}", headers=env["h_admin"], json={"summary": "Admin edit"}).status_code == 403
    assert test_client.post(f"/api/projects/{pid}/notes", headers=env["h_admin"], json={"title": "A", "body": "B"}).status_code == 403
    assert test_client.patch(f"/api/notes/{note_id}", headers=env["h_admin"], json={"title": "A"}).status_code == 403
    assert test_client.delete(f"/api/notes/{note_id}", headers=env["h_admin"]).status_code == 403
    assert test_client.post(f"/api/projects/{pid}/checklist", headers=env["h_admin"], json={"title": "A"}).status_code == 403
    assert test_client.patch(f"/api/checklist/{item_id}", headers=env["h_admin"], json={"is_done": True}).status_code == 403
    assert test_client.delete(f"/api/checklist/{item_id}", headers=env["h_admin"]).status_code == 403


def test_repo_url_and_project_update_rules(client):
    test_client, db = client
    env = _setup_workspace_env(db, test_client)
    pid = env["project_id"]

    # 1. Valid GitHub URLs
    res_valid1 = test_client.patch(
        f"/api/projects/{pid}",
        headers=env["h_lead"],
        json={"repo_url": "  https://github.com/hacknova/core  "},
    )
    assert res_valid1.status_code == 200
    assert res_valid1.json()["repo_url"] == "https://github.com/hacknova/core"

    res_valid2 = test_client.patch(
        f"/api/projects/{pid}",
        headers=env["h_member"],
        json={"repo_url": "https://github.com/hacknova/core/tree/main"},
    )
    assert res_valid2.status_code == 200
    assert res_valid2.json()["repo_url"] == "https://github.com/hacknova/core/tree/main"

    # 2. Empty string stores as NULL
    res_clear = test_client.patch(
        f"/api/projects/{pid}",
        headers=env["h_member"],
        json={"repo_url": "   "},
    )
    assert res_clear.status_code == 200
    assert res_clear.json()["repo_url"] is None

    # 3. Invalid URLs -> 422
    for bad_url in [
        "http://github.com/hacknova/core",
        "https://gitlab.com/hacknova/core",
        "https://github.com/hacknova",
        "not-a-url",
        "https://github.com/hacknova/core extra_chars",
    ]:
        res_bad = test_client.patch(
            f"/api/projects/{pid}",
            headers=env["h_lead"],
            json={"repo_url": bad_url},
        )
        assert res_bad.status_code == 422

    # 4. Title permission: leader can change title
    res_title_lead = test_client.patch(
        f"/api/projects/{pid}",
        headers=env["h_lead"],
        json={"title": "Updated Title By Lead"},
    )
    assert res_title_lead.status_code == 200
    assert res_title_lead.json()["title"] == "Updated Title By Lead"

    # Member changing title -> 403
    res_title_member = test_client.patch(
        f"/api/projects/{pid}",
        headers=env["h_member"],
        json={"title": "Unauthorized Title By Member"},
    )
    assert res_title_member.status_code == 403

    # Member resending unchanged title -> 200
    res_same_title = test_client.patch(
        f"/api/projects/{pid}",
        headers=env["h_member"],
        json={"title": "Updated Title By Lead", "summary": "Member updated summary"},
    )
    assert res_same_title.status_code == 200
    assert res_same_title.json()["summary"] == "Member updated summary"


def test_notes_crud_search_and_validation(client):
    test_client, db = client
    env = _setup_workspace_env(db, test_client)
    pid = env["project_id"]

    # 1. Whitespace-only title or body -> 422
    assert test_client.post(f"/api/projects/{pid}/notes", headers=env["h_member"], json={"title": "   ", "body": "Body"}).status_code == 422
    assert test_client.post(f"/api/projects/{pid}/notes", headers=env["h_member"], json={"title": "Valid", "body": "   "}).status_code == 422

    # 2. Body length > 20000 -> 422
    huge_body = "x" * 20001
    assert test_client.post(f"/api/projects/{pid}/notes", headers=env["h_member"], json={"title": "Valid", "body": huge_body}).status_code == 422

    # Valid body = 20000 chars -> 201
    max_body = "x" * 20000
    res_max = test_client.post(f"/api/projects/{pid}/notes", headers=env["h_member"], json={"title": "Max Body Note", "body": max_body})
    assert res_max.status_code == 201

    # 3. Member creates note
    res_note = test_client.post(
        f"/api/projects/{pid}/notes",
        headers=env["h_member"],
        json={"title": "Architecture Overview", "body": "Frontend uses React and Tailwind."},
    )
    assert res_note.status_code == 201
    note = res_note.json()
    assert note["title"] == "Architecture Overview"
    assert note["creator_name"] == "Member M6"
    note_id = note["id"]

    # 4. Search and pagination
    test_client.post(f"/api/projects/{pid}/notes", headers=env["h_lead"], json={"title": "Database Schema", "body": "Postgres models."})
    test_client.post(f"/api/projects/{pid}/notes", headers=env["h_lead"], json={"title": "API Endpoints", "body": "FastAPI routes."})

    res_search = test_client.get(f"/api/projects/{pid}/notes?q=Schema", headers=env["h_member"])
    assert res_search.status_code == 200
    assert len(res_search.json()) == 1
    assert res_search.json()[0]["title"] == "Database Schema"

    # 5. Delete authorization: other member cannot delete if not author
    lead2 = create_student(db, "member2_m6@test.dev", "Member 2")
    h_member2 = auth_header(test_client, "member2_m6@test.dev", "Student@123")
    test_client.post("/api/teams/join", headers=h_member2, json={"invite_code": "placeholder", "member_role": "Member"})
    # join with actual invite code
    team = db.scalar(select(Team).where(Team.id == UUID(env["team_id"])))
    test_client.post("/api/teams/join", headers=h_member2, json={"invite_code": team.invite_code, "member_role": "Member"})

    # member2 is not author and not leader -> 403
    res_del_m2 = test_client.delete(f"/api/notes/{note_id}", headers=h_member2)
    assert res_del_m2.status_code == 403

    # Leader can delete -> 200
    res_del_lead = test_client.delete(f"/api/notes/{note_id}", headers=env["h_lead"])
    assert res_del_lead.status_code == 200
    assert test_client.get(f"/api/notes/{note_id}", headers=env["h_lead"]).status_code == 404


def test_checklist_crud_toggle_and_defaults_idempotency(client):
    test_client, db = client
    env = _setup_workspace_env(db, test_client)
    pid = env["project_id"]

    # 1. Defaults creation: 201 with exactly 8 items in specified order
    res_def = test_client.post(f"/api/projects/{pid}/checklist/defaults", headers=env["h_member"])
    assert res_def.status_code == 201
    items = res_def.json()
    assert len(items) == 8
    assert items[0]["title"] == "README with setup steps"
    assert items[0]["position"] == 0
    assert items[7]["title"] == "Final submission completed"
    assert items[7]["position"] == 7

    # 2. Defaults idempotency: calling again returns 409
    res_def2 = test_client.post(f"/api/projects/{pid}/checklist/defaults", headers=env["h_lead"])
    assert res_def2.status_code == 409

    # 3. Toggle is_done sets and clears completed_at
    first_item = items[0]
    first_id = first_item["id"]
    assert first_item["is_done"] is False
    assert first_item["completed_at"] is None

    # Toggle to true
    res_toggle_on = test_client.patch(f"/api/checklist/{first_id}", headers=env["h_member"], json={"is_done": True})
    assert res_toggle_on.status_code == 200
    assert res_toggle_on.json()["is_done"] is True
    assert res_toggle_on.json()["completed_at"] is not None

    # Toggle back to false
    res_toggle_off = test_client.patch(f"/api/checklist/{first_id}", headers=env["h_member"], json={"is_done": False})
    assert res_toggle_off.status_code == 200
    assert res_toggle_off.json()["is_done"] is False
    assert res_toggle_off.json()["completed_at"] is None

    # 4. URL validation on checklist item: must start with http:// or https://
    res_bad_url = test_client.patch(f"/api/checklist/{first_id}", headers=env["h_member"], json={"url": "ftp://files.example.com"})
    assert res_bad_url.status_code == 422

    res_good_url = test_client.patch(f"/api/checklist/{first_id}", headers=env["h_member"], json={"url": "https://hacknova.dev/demo"})
    assert res_good_url.status_code == 200
    assert res_good_url.json()["url"] == "https://hacknova.dev/demo"

    # 5. Assignee validation: active member 200, outsider 400
    res_bad_assignee = test_client.patch(f"/api/checklist/{first_id}", headers=env["h_member"], json={"assignee_id": str(env["outsider"].id)})
    assert res_bad_assignee.status_code == 400

    res_good_assignee = test_client.patch(f"/api/checklist/{first_id}", headers=env["h_member"], json={"assignee_id": str(env["member"].id)})
    assert res_good_assignee.status_code == 200
    assert res_good_assignee.json()["assignee_id"] == str(env["member"].id)
    assert res_good_assignee.json()["assignee_name"] == "Member M6"

    # 6. Title whitespace rejection -> 422
    assert test_client.post(f"/api/projects/{pid}/checklist", headers=env["h_member"], json={"title": "   "}).status_code == 422
    assert test_client.patch(f"/api/checklist/{first_id}", headers=env["h_member"], json={"title": "   "}).status_code == 422


def test_project_summary_additions(client):
    test_client, db = client
    env = _setup_workspace_env(db, test_client)
    pid = env["project_id"]

    # Set repo_url
    test_client.patch(f"/api/projects/{pid}", headers=env["h_lead"], json={"repo_url": "https://github.com/hacknova/repo"})
    # Create notes
    test_client.post(f"/api/projects/{pid}/notes", headers=env["h_lead"], json={"title": "Note 1", "body": "B1"})
    test_client.post(f"/api/projects/{pid}/notes", headers=env["h_lead"], json={"title": "Note 2", "body": "B2"})
    # Create defaults checklist (8 items)
    items = test_client.post(f"/api/projects/{pid}/checklist/defaults", headers=env["h_lead"]).json()
    # Mark 2 as done
    test_client.patch(f"/api/checklist/{items[0]['id']}", headers=env["h_lead"], json={"is_done": True})
    test_client.patch(f"/api/checklist/{items[1]['id']}", headers=env["h_lead"], json={"is_done": True})

    res_sum = test_client.get(f"/api/projects/{pid}/summary", headers=env["h_member"])
    assert res_sum.status_code == 200
    sum_data = res_sum.json()

    assert sum_data["repo_url"] == "https://github.com/hacknova/repo"
    assert sum_data["notes_count"] == 2
    assert sum_data["checklist_total"] == 8
    assert sum_data["checklist_done"] == 2
    assert sum_data["checklist_percent"] == 25  # (2 / 8) * 100


def test_activity_logging_and_no_emails_in_details(client):
    test_client, db = client
    env = _setup_workspace_env(db, test_client)
    pid = env["project_id"]

    # Perform updates that trigger activity
    test_client.patch(f"/api/projects/{pid}", headers=env["h_lead"], json={"summary": "New summary"})
    n = test_client.post(f"/api/projects/{pid}/notes", headers=env["h_lead"], json={"title": "Activity Note", "body": "Content"}).json()
    test_client.patch(f"/api/notes/{n['id']}", headers=env["h_lead"], json={"title": "Updated Activity Note"})
    test_client.delete(f"/api/notes/{n['id']}", headers=env["h_lead"])

    c = test_client.post(f"/api/projects/{pid}/checklist", headers=env["h_lead"], json={"title": "Activity Item"}).json()
    test_client.patch(f"/api/checklist/{c['id']}", headers=env["h_lead"], json={"is_done": True})
    test_client.patch(f"/api/checklist/{c['id']}", headers=env["h_lead"], json={"title": "Renamed Item"})
    test_client.delete(f"/api/checklist/{c['id']}", headers=env["h_lead"])

    # Query activity logs
    res_act = test_client.get(f"/api/projects/{pid}/activity?limit=50", headers=env["h_lead"])
    assert res_act.status_code == 200
    logs = res_act.json()
    actions = [l["action"] for l in logs]

    assert "project_updated" in actions
    assert "note_created" in actions
    assert "note_updated" in actions
    assert "note_deleted" in actions
    assert "checklist_item_created" in actions
    assert "checklist_item_toggled" in actions
    assert "checklist_item_updated" in actions
    assert "checklist_item_deleted" in actions

    for log in logs:
        details_str = str(log["details"]).lower()
        assert "@test.dev" not in details_str, f"Found email in activity log details: {log['details']}"


def test_unassign_checklist_items_on_leave_and_removal(client):
    test_client, db = client
    env = _setup_workspace_env(db, test_client)
    pid = env["project_id"]
    team_id = env["team_id"]
    member_id = str(env["member"].id)

    # Create task and checklist item assigned to member
    test_client.post(f"/api/projects/{pid}/tasks", headers=env["h_lead"], json={"title": "Member Task", "assignee_id": member_id})
    c_item = test_client.post(f"/api/projects/{pid}/checklist", headers=env["h_lead"], json={"title": "Member Checklist Item", "assignee_id": member_id}).json()
    assert c_item["assignee_id"] == member_id

    # Member leaves team
    res_leave = test_client.post(f"/api/teams/{team_id}/leave", headers=env["h_member"])
    assert res_leave.status_code == 200

    # Verify checklist item was unassigned
    res_check = test_client.get(f"/api/projects/{pid}/checklist", headers=env["h_lead"])
    assert res_check.status_code == 200
    items = res_check.json()
    target = next(it for it in items if it["id"] == c_item["id"])
    assert target["assignee_id"] is None

    # Now have another member join and be removed by leader
    m3 = create_student(db, "member3_m6@test.dev", "Member 3")
    h_m3 = auth_header(test_client, "member3_m6@test.dev", "Student@123")
    team = db.scalar(select(Team).where(Team.id == UUID(team_id)))
    test_client.post("/api/teams/join", headers=h_m3, json={"invite_code": team.invite_code, "member_role": "Member"})

    # Assign checklist item to m3
    test_client.patch(f"/api/checklist/{c_item['id']}", headers=env["h_lead"], json={"assignee_id": str(m3.id)})

    # Leader removes m3
    tm_entry = db.scalar(select(TeamMember).where(TeamMember.team_id == UUID(team_id), TeamMember.user_id == m3.id))
    res_rem = test_client.post(f"/api/teams/{team_id}/members/{tm_entry.id}/remove", headers=env["h_lead"])
    assert res_rem.status_code == 200

    # Verify unassigned again
    res_check2 = test_client.get(f"/api/projects/{pid}/checklist", headers=env["h_lead"])
    target2 = next(it for it in res_check2.json() if it["id"] == c_item["id"])
    assert target2["assignee_id"] is None


def test_sqlite_orm_cascade_on_team_deletion(client):
    test_client, db = client
    env = _setup_workspace_env(db, test_client)
    pid = env["project_id"]
    team_id = env["team_id"]

    # Add notes and checklist items
    n = test_client.post(f"/api/projects/{pid}/notes", headers=env["h_lead"], json={"title": "Cascade Note", "body": "Body"}).json()
    c = test_client.post(f"/api/projects/{pid}/checklist", headers=env["h_lead"], json={"title": "Cascade Item"}).json()

    # Query db to verify they exist
    note_id = UUID(n["id"])
    item_id = UUID(c["id"])
    proj_id = UUID(pid)
    t_id = UUID(team_id)

    assert db.get(ProjectNote, note_id) is not None
    assert db.get(ChecklistItem, item_id) is not None
    assert db.get(Project, proj_id) is not None

    # Delete team directly via ORM to simulate cascade
    team = db.get(Team, t_id)
    db.delete(team)
    db.commit()

    # Verify project, notes, and checklist items are all cascade deleted
    assert db.get(Team, t_id) is None
    assert db.get(Project, proj_id) is None
    assert db.get(ProjectNote, note_id) is None
    assert db.get(ChecklistItem, item_id) is None
