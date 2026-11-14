from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select
from app.models.hackathon import HackathonProblem
from app.models.project import ActivityLog, Milestone, Project, Task, TaskPriority, TaskStatus
from app.models.team import MemberStatus, Team, TeamMember, TeamProblemSelection
from tests.factories import auth_header, create_admin, create_student, make_hackathon


def _setup_team_with_problem(db, test_client):
    lead = create_student(db, "lead@test.dev", "Lead Builder")
    member = create_student(db, "member@test.dev", "Member Builder")
    outsider = create_student(db, "outsider@test.dev", "Outsider Builder")
    admin = create_admin(db)
    hackathon = make_hackathon(db)

    h_lead = auth_header(test_client, "lead@test.dev", "Student@123")
    h_member = auth_header(test_client, "member@test.dev", "Student@123")
    h_outsider = auth_header(test_client, "outsider@test.dev", "Student@123")
    h_admin = auth_header(test_client, "admin@test.dev", "Admin@12345")

    # Lead creates team
    c = test_client.post(
        "/api/teams",
        headers=h_lead,
        json={"hackathon_id": str(hackathon.id), "name": "Sprint Team", "member_role": "Team Lead"},
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

    return {
        "lead": lead,
        "member": member,
        "outsider": outsider,
        "admin": admin,
        "hackathon": hackathon,
        "team_id": team_id,
        "prob_id": prob_id,
        "h_lead": h_lead,
        "h_member": h_member,
        "h_outsider": h_outsider,
        "h_admin": h_admin,
    }


def test_project_creation_rules(client):
    """
    - Only the leader can create a project (403 for member/outsider)
    - Project requires a selected problem (400 if none)
    - One project per team (409 if already exists)
    """
    test_client, db = client
    env = _setup_team_with_problem(db, test_client)
    team_id = env["team_id"]

    # Member cannot create project (403)
    res_mem = test_client.post(f"/api/teams/{team_id}/project", headers=env["h_member"], json={})
    assert res_mem.status_code == 403

    # Outsider cannot create project (403)
    res_out = test_client.post(f"/api/teams/{team_id}/project", headers=env["h_outsider"], json={})
    assert res_out.status_code == 403

    # Another team without selected problem
    lead2 = create_student(db, "lead2@test.dev", "Lead 2")
    h_lead2 = auth_header(test_client, "lead2@test.dev", "Student@123")
    c2 = test_client.post(
        "/api/teams",
        headers=h_lead2,
        json={"hackathon_id": str(env["hackathon"].id), "name": "No Prob Team", "member_role": "Team Lead"},
    ).json()
    res_no_prob = test_client.post(f"/api/teams/{c2['id']}/project", headers=h_lead2, json={})
    assert res_no_prob.status_code == 400
    assert "select a problem" in res_no_prob.json()["detail"].lower()

    # Leader creates project successfully
    res_lead = test_client.post(f"/api/teams/{team_id}/project", headers=env["h_lead"], json={"summary": "Our sprint hub"})
    assert res_lead.status_code == 201
    proj = res_lead.json()
    assert proj["team_id"] == team_id
    assert "Sprint Team" in proj["title"]

    # Second project creation on same team -> 409
    res_dup = test_client.post(f"/api/teams/{team_id}/project", headers=env["h_lead"], json={})
    assert res_dup.status_code == 409


def test_task_creation_validation_and_assignee(client):
    """
    - Assignee must be an active team member (400 otherwise)
    - Milestone must belong to the same project (400 otherwise)
    - Any active member may create tasks
    """
    test_client, db = client
    env = _setup_team_with_problem(db, test_client)
    proj = test_client.post(f"/api/teams/{env['team_id']}/project", headers=env["h_lead"], json={}).json()
    proj_id = proj["id"]

    # Assigning to outsider -> 400
    bad_assign = test_client.post(
        f"/api/projects/{proj_id}/tasks",
        headers=env["h_member"],
        json={"title": "Task 1", "assignee_id": str(env["outsider"].id)},
    )
    assert bad_assign.status_code == 400
    assert "active member" in bad_assign.json()["detail"].lower()

    # Assigning to non-existent milestone -> 400
    bad_m = test_client.post(
        f"/api/projects/{proj_id}/tasks",
        headers=env["h_member"],
        json={"title": "Task 1", "milestone_id": str(uuid4())},
    )
    assert bad_m.status_code == 400
    assert "milestone does not belong" in bad_m.json()["detail"].lower()

    # Valid task created by member
    good_task = test_client.post(
        f"/api/projects/{proj_id}/tasks",
        headers=env["h_member"],
        json={
            "title": "Build Auth",
            "description": "JWT implementation",
            "priority": "high",
            "assignee_id": str(env["member"].id),
            "due_date": str(date.today() + timedelta(days=2)),
        },
    )
    assert good_task.status_code == 201
    t_data = good_task.json()
    assert t_data["title"] == "Build Auth"
    assert t_data["assignee_name"] == "Member Builder"
    assert t_data["priority"] == "high"
    assert t_data["status"] == "todo"
    assert t_data["position"] == 0


def test_task_update_rejects_status_and_position(client):
    """
    PATCH /api/tasks/{id} edits only title, description, priority, assignee, milestone and due_date.
    Status and position must be rejected with 422.
    """
    test_client, db = client
    env = _setup_team_with_problem(db, test_client)
    proj = test_client.post(f"/api/teams/{env['team_id']}/project", headers=env["h_lead"], json={}).json()
    t = test_client.post(
        f"/api/projects/{proj['id']}/tasks",
        headers=env["h_lead"],
        json={"title": "Task Initial"},
    ).json()

    # Try updating status via PATCH /tasks/{id} -> 422
    r_stat = test_client.patch(f"/api/tasks/{t['id']}", headers=env["h_lead"], json={"status": "completed"})
    assert r_stat.status_code == 422

    # Try updating position via PATCH /tasks/{id} -> 422
    r_pos = test_client.patch(f"/api/tasks/{t['id']}", headers=env["h_lead"], json={"position": 5})
    assert r_pos.status_code == 422

    # Valid patch
    r_valid = test_client.patch(
        f"/api/tasks/{t['id']}",
        headers=env["h_lead"],
        json={"title": "Task Updated", "priority": "critical"},
    )
    assert r_valid.status_code == 200
    assert r_valid.json()["title"] == "Task Updated"
    assert r_valid.json()["priority"] == "critical"


def test_task_move_reindexing_and_completed_at(client):
    """
    - Move reindexes positions in column(s) contiguously
    - Negative position returns 422
    - Clamps position beyond end of column
    - Moving to completed sets completed_at; moving out clears it
    """
    test_client, db = client
    env = _setup_team_with_problem(db, test_client)
    proj = test_client.post(f"/api/teams/{env['team_id']}/project", headers=env["h_lead"], json={}).json()
    proj_id = proj["id"]

    # Create 3 tasks in todo
    t1 = test_client.post(f"/api/projects/{proj_id}/tasks", headers=env["h_lead"], json={"title": "T1"}).json()
    t2 = test_client.post(f"/api/projects/{proj_id}/tasks", headers=env["h_lead"], json={"title": "T2"}).json()
    t3 = test_client.post(f"/api/projects/{proj_id}/tasks", headers=env["h_lead"], json={"title": "T3"}).json()

    assert t1["position"] == 0
    assert t2["position"] == 1
    assert t3["position"] == 2

    # Negative position -> 422
    neg_move = test_client.patch(f"/api/tasks/{t1['id']}/move", headers=env["h_lead"], json={"status": "todo", "position": -1})
    assert neg_move.status_code == 422

    # Clamped move: move T1 to position 99 in todo -> clamped to 2
    clamp_move = test_client.patch(f"/api/tasks/{t1['id']}/move", headers=env["h_lead"], json={"status": "todo", "position": 99})
    assert clamp_move.status_code == 200
    assert clamp_move.json()["position"] == 2

    # Check order of todo tasks now: T2=0, T3=1, T1=2
    tasks_todo = test_client.get(f"/api/projects/{proj_id}/tasks?status=todo", headers=env["h_lead"]).json()
    assert [t["title"] for t in tasks_todo] == ["T2", "T3", "T1"]
    assert [t["position"] for t in tasks_todo] == [0, 1, 2]

    # Move T2 to completed
    m_comp = test_client.patch(f"/api/tasks/{t2['id']}/move", headers=env["h_lead"], json={"status": "completed", "position": 0})
    assert m_comp.status_code == 200
    assert m_comp.json()["status"] == "completed"
    assert m_comp.json()["completed_at"] is not None

    # Remaining todo tasks reindexed to 0, 1
    tasks_todo_after = test_client.get(f"/api/projects/{proj_id}/tasks?status=todo", headers=env["h_lead"]).json()
    assert [t["title"] for t in tasks_todo_after] == ["T3", "T1"]
    assert [t["position"] for t in tasks_todo_after] == [0, 1]

    # Move T2 back to in_progress -> completed_at must be cleared
    m_back = test_client.patch(f"/api/tasks/{t2['id']}/move", headers=env["h_lead"], json={"status": "in_progress", "position": 0})
    assert m_back.status_code == 200
    assert m_back.json()["status"] == "in_progress"
    assert m_back.json()["completed_at"] is None


def test_task_and_milestone_deletion_permissions(client):
    """
    - Deleting task requires team leader or task creator (403 for another member)
    - Deleting milestone requires leader (403 for member)
    - Deleting milestone unsets task.milestone_id without deleting the task
    """
    test_client, db = client
    env = _setup_team_with_problem(db, test_client)
    proj = test_client.post(f"/api/teams/{env['team_id']}/project", headers=env["h_lead"], json={}).json()
    proj_id = proj["id"]

    # Member creates milestone
    m = test_client.post(f"/api/projects/{proj_id}/milestones", headers=env["h_member"], json={"title": "Sprint 1"}).json()

    # Member creates a task
    t_by_member = test_client.post(
        f"/api/projects/{proj_id}/tasks",
        headers=env["h_member"],
        json={"title": "Member Task", "milestone_id": m["id"]},
    ).json()

    # Lead creates a task
    t_by_lead = test_client.post(
        f"/api/projects/{proj_id}/tasks",
        headers=env["h_lead"],
        json={"title": "Lead Task"},
    ).json()

    # Member tries to delete Lead's task -> 403
    del_fail = test_client.delete(f"/api/tasks/{t_by_lead['id']}", headers=env["h_member"])
    assert del_fail.status_code == 403

    # Member can delete their own task -> 200
    del_own = test_client.delete(f"/api/tasks/{t_by_member['id']}", headers=env["h_member"])
    assert del_own.status_code == 200

    # Leader can delete any task
    del_lead = test_client.delete(f"/api/tasks/{t_by_lead['id']}", headers=env["h_lead"])
    assert del_lead.status_code == 200

    # Task with milestone
    task_with_m = test_client.post(
        f"/api/projects/{proj_id}/tasks",
        headers=env["h_lead"],
        json={"title": "Milestone Task", "milestone_id": m["id"]},
    ).json()

    # Member tries to delete milestone -> 403
    del_m_mem = test_client.delete(f"/api/milestones/{m['id']}", headers=env["h_member"])
    assert del_m_mem.status_code == 403

    # Leader deletes milestone -> 200
    del_m_lead = test_client.delete(f"/api/milestones/{m['id']}", headers=env["h_lead"])
    assert del_m_lead.status_code == 200

    # Task still exists with milestone_id unset
    task_after = test_client.get(f"/api/tasks/{task_with_m['id']}", headers=env["h_lead"]).json()
    assert task_after["id"] == task_with_m["id"]
    assert task_after["milestone_id"] is None


def test_project_summary_metrics(client):
    """
    - Status counts, total, percent_complete (0 when total==0)
    - Overdue count (due_date < today and not completed)
    - Workload: active members only + unassigned_count
    - Milestone progress
    """
    test_client, db = client
    env = _setup_team_with_problem(db, test_client)
    proj = test_client.post(f"/api/teams/{env['team_id']}/project", headers=env["h_lead"], json={}).json()
    proj_id = proj["id"]

    # Initial summary with 0 tasks
    s0 = test_client.get(f"/api/projects/{proj_id}/summary", headers=env["h_lead"]).json()
    assert s0["total_tasks"] == 0
    assert s0["percent_complete"] == 0
    assert s0["overdue_count"] == 0
    assert s0["unassigned_count"] == 0

    # Create milestone
    m = test_client.post(f"/api/projects/{proj_id}/milestones", headers=env["h_lead"], json={"title": "Beta"}).json()

    # Task 1: Overdue unassigned todo
    yesterday = str(date.today() - timedelta(days=1))
    test_client.post(
        f"/api/projects/{proj_id}/tasks",
        headers=env["h_lead"],
        json={"title": "Overdue Task", "status": "todo", "due_date": yesterday, "milestone_id": m["id"]},
    )

    # Task 2: Completed assigned to member
    test_client.post(
        f"/api/projects/{proj_id}/tasks",
        headers=env["h_lead"],
        json={"title": "Done Task", "status": "completed", "assignee_id": str(env["member"].id), "milestone_id": m["id"]},
    )

    # Task 3: In progress assigned to lead
    test_client.post(
        f"/api/projects/{proj_id}/tasks",
        headers=env["h_lead"],
        json={"title": "Active Task", "status": "in_progress", "assignee_id": str(env["lead"].id)},
    )

    s1 = test_client.get(f"/api/projects/{proj_id}/summary", headers=env["h_lead"]).json()
    assert s1["total_tasks"] == 3
    assert s1["todo_count"] == 1
    assert s1["in_progress_count"] == 1
    assert s1["review_count"] == 0
    assert s1["completed_count"] == 1
    assert s1["percent_complete"] == 33  # 1/3 = 33%
    assert s1["overdue_count"] == 1
    assert s1["unassigned_count"] == 1

    # Check workload sum + unassigned = total
    assigned_sum = sum(w["open_tasks"] + w["completed_tasks"] for w in s1["workload"])
    assert assigned_sum + s1["unassigned_count"] == s1["total_tasks"]

    # Check milestone progress
    mp = s1["milestone_progress"][0]
    assert mp["title"] == "Beta"
    assert mp["total_tasks"] == 2
    assert mp["completed_tasks"] == 1
    assert mp["percent_complete"] == 50


def test_activity_log_entries_and_no_email(client):
    """
    Activity entries written in same transaction.
    Guaranteed: details never contain email addresses.
    """
    test_client, db = client
    env = _setup_team_with_problem(db, test_client)
    proj = test_client.post(f"/api/teams/{env['team_id']}/project", headers=env["h_lead"], json={}).json()
    proj_id = proj["id"]

    t = test_client.post(f"/api/projects/{proj_id}/tasks", headers=env["h_lead"], json={"title": "Task Log"}).json()
    test_client.patch(f"/api/tasks/{t['id']}/move", headers=env["h_lead"], json={"status": "in_progress", "position": 0})
    m = test_client.post(f"/api/projects/{proj_id}/milestones", headers=env["h_lead"], json={"title": "M1"}).json()
    test_client.delete(f"/api/milestones/{m['id']}", headers=env["h_lead"])

    act = test_client.get(f"/api/projects/{proj_id}/activity", headers=env["h_lead"]).json()
    assert len(act) >= 4
    actions = [a["action"] for a in act]
    assert "milestone_deleted" in actions
    assert "milestone_created" in actions
    assert "task_moved" in actions
    assert "task_created" in actions
    assert "project_created" in actions

    for entry in act:
        # Check details never contain emails
        for k, v in entry["details"].items():
            assert "email" not in k.lower()
            if isinstance(v, str):
                assert "@" not in v


def test_all_endpoints_outsider_403_and_anonymous_401(client):
    """
    Outsider gets 403 on EVERY endpoint.
    Anonymous (no token) gets 401 on EVERY endpoint.
    """
    test_client, db = client
    env = _setup_team_with_problem(db, test_client)
    proj = test_client.post(f"/api/teams/{env['team_id']}/project", headers=env["h_lead"], json={}).json()
    proj_id = proj["id"]
    t = test_client.post(f"/api/projects/{proj_id}/tasks", headers=env["h_lead"], json={"title": "T"}).json()
    task_id = t["id"]
    m = test_client.post(f"/api/projects/{proj_id}/milestones", headers=env["h_lead"], json={"title": "M"}).json()
    m_id = m["id"]

    h_out = env["h_outsider"]

    endpoints = [
        ("GET", f"/api/projects/{proj_id}"),
        ("GET", f"/api/projects/{proj_id}/tasks"),
        ("POST", f"/api/projects/{proj_id}/tasks", {"title": "X"}),
        ("GET", f"/api/tasks/{task_id}"),
        ("PATCH", f"/api/tasks/{task_id}", {"title": "X2"}),
        ("DELETE", f"/api/tasks/{task_id}"),
        ("PATCH", f"/api/tasks/{task_id}/move", {"status": "todo", "position": 0}),
        ("GET", f"/api/projects/{proj_id}/milestones"),
        ("POST", f"/api/projects/{proj_id}/milestones", {"title": "M2"}),
        ("PATCH", f"/api/milestones/{m_id}", {"title": "M3"}),
        ("DELETE", f"/api/milestones/{m_id}"),
        ("GET", f"/api/projects/{proj_id}/summary"),
        ("GET", f"/api/projects/{proj_id}/activity"),
    ]

    for item in endpoints:
        method = item[0]
        url = item[1]
        body = item[2] if len(item) > 2 else None

        # Anonymous -> 401
        if method == "GET":
            r_anon = test_client.get(url)
            r_out = test_client.get(url, headers=h_out)
        elif method == "POST":
            r_anon = test_client.post(url, json=body)
            r_out = test_client.post(url, headers=h_out, json=body)
        elif method == "PATCH":
            r_anon = test_client.patch(url, json=body)
            r_out = test_client.patch(url, headers=h_out, json=body)
        elif method == "DELETE":
            r_anon = test_client.delete(url)
            r_out = test_client.delete(url, headers=h_out)

        assert r_anon.status_code == 401, f"Expected 401 on anonymous {method} {url}, got {r_anon.status_code}"
        assert r_out.status_code == 403, f"Expected 403 on outsider {method} {url}, got {r_out.status_code}"


def test_admin_read_only_permissions(client):
    """
    Admins can read all project data, but cannot write (403 on write).
    """
    test_client, db = client
    env = _setup_team_with_problem(db, test_client)
    proj = test_client.post(f"/api/teams/{env['team_id']}/project", headers=env["h_lead"], json={}).json()
    proj_id = proj["id"]
    t = test_client.post(f"/api/projects/{proj_id}/tasks", headers=env["h_lead"], json={"title": "T"}).json()
    m = test_client.post(f"/api/projects/{proj_id}/milestones", headers=env["h_lead"], json={"title": "M"}).json()

    h_admin = env["h_admin"]

    # Admin reads -> 200
    assert test_client.get(f"/api/projects/{proj_id}", headers=h_admin).status_code == 200
    assert test_client.get(f"/api/projects/{proj_id}/tasks", headers=h_admin).status_code == 200
    assert test_client.get(f"/api/tasks/{t['id']}", headers=h_admin).status_code == 200
    assert test_client.get(f"/api/projects/{proj_id}/milestones", headers=h_admin).status_code == 200
    assert test_client.get(f"/api/projects/{proj_id}/summary", headers=h_admin).status_code == 200
    assert test_client.get(f"/api/projects/{proj_id}/activity", headers=h_admin).status_code == 200

    # Admin writes -> 403
    assert test_client.post(f"/api/projects/{proj_id}/tasks", headers=h_admin, json={"title": "X"}).status_code == 403
    assert test_client.patch(f"/api/tasks/{t['id']}", headers=h_admin, json={"title": "X"}).status_code == 403
    assert test_client.delete(f"/api/tasks/{t['id']}", headers=h_admin).status_code == 403
    assert test_client.patch(f"/api/tasks/{t['id']}/move", headers=h_admin, json={"status": "review", "position": 0}).status_code == 403
    assert test_client.post(f"/api/projects/{proj_id}/milestones", headers=h_admin, json={"title": "M2"}).status_code == 403
    assert test_client.patch(f"/api/milestones/{m['id']}", headers=h_admin, json={"title": "M2"}).status_code == 403
    assert test_client.delete(f"/api/milestones/{m['id']}", headers=h_admin).status_code == 403


def test_member_leaving_and_removed_unassigns_tasks(client):
    """
    - When a member leaves, their tasks are unassigned and activity logged.
    - When a member is removed, their tasks are unassigned and activity logged.
    """
    test_client, db = client
    env = _setup_team_with_problem(db, test_client)
    team_id = env["team_id"]
    proj = test_client.post(f"/api/teams/{team_id}/project", headers=env["h_lead"], json={}).json()
    proj_id = proj["id"]

    # Assign task to member
    t1 = test_client.post(
        f"/api/projects/{proj_id}/tasks",
        headers=env["h_lead"],
        json={"title": "Task Assigned to Member", "assignee_id": str(env["member"].id)},
    ).json()

    # Member leaves
    l_res = test_client.post(f"/api/teams/{team_id}/leave", headers=env["h_member"])
    assert l_res.status_code == 200

    # Task must now have assignee_id == None
    t1_after = test_client.get(f"/api/tasks/{t1['id']}", headers=env["h_lead"]).json()
    assert t1_after["assignee_id"] is None
    assert t1_after["assignee_name"] is None

    # Check unassigned activity log
    act = test_client.get(f"/api/projects/{proj_id}/activity", headers=env["h_lead"]).json()
    assert any(a["action"] == "task_unassigned" for a in act)

    # Re-join member with code
    team_info = test_client.get(f"/api/teams/{team_id}", headers=env["h_lead"]).json()
    test_client.post("/api/teams/join", headers=env["h_member"], json={"invite_code": team_info["invite_code"], "member_role": "Member"})

    # Assign another task to member
    t2 = test_client.post(
        f"/api/projects/{proj_id}/tasks",
        headers=env["h_lead"],
        json={"title": "Task 2 for Member", "assignee_id": str(env["member"].id)},
    ).json()

    # Leader removes member
    member_record = next(m for m in test_client.get(f"/api/teams/{team_id}", headers=env["h_lead"]).json()["members"] if m["user_id"] == str(env["member"].id))
    rem_res = test_client.post(f"/api/teams/{team_id}/members/{member_record['id']}/remove", headers=env["h_lead"])
    assert rem_res.status_code == 200

    # Task 2 is unassigned
    t2_after = test_client.get(f"/api/tasks/{t2['id']}", headers=env["h_lead"]).json()
    assert t2_after["assignee_id"] is None


def test_team_deletion_cascade_on_sqlite(client):
    """
    Deleting a team removes its project, tasks, milestones, and activity logs on SQLite.
    (Tests ORM-level cascade delete on leave_team when leader is sole active member).
    """
    test_client, db = client
    lead = create_student(db, "sololead@test.dev", "Solo Lead")
    hackathon = make_hackathon(db)
    h_lead = auth_header(test_client, "sololead@test.dev", "Student@123")

    c = test_client.post(
        "/api/teams",
        headers=h_lead,
        json={"hackathon_id": str(hackathon.id), "name": "Solo Team", "member_role": "Team Lead"},
    ).json()
    team_id = c["id"]

    # Select problem
    test_client.post(f"/api/teams/{team_id}/problem", headers=h_lead, json={"problem_id": str(hackathon.problems[0].id)})

    # Create project
    proj = test_client.post(f"/api/teams/{team_id}/project", headers=h_lead, json={}).json()
    proj_id = UUID(proj["id"])

    # Create milestone, task, activity log
    m = test_client.post(f"/api/projects/{proj_id}/milestones", headers=h_lead, json={"title": "M"}).json()
    t = test_client.post(f"/api/projects/{proj_id}/tasks", headers=h_lead, json={"title": "T"}).json()

    # Verify rows exist in DB
    assert db.get(Project, proj_id) is not None
    assert db.get(Milestone, UUID(m["id"])) is not None
    assert db.get(Task, UUID(t["id"])) is not None
    assert len(db.scalars(select(ActivityLog).where(ActivityLog.project_id == proj_id)).all()) > 0

    # Solo leader leaves team -> deletes team
    leave_res = test_client.post(f"/api/teams/{team_id}/leave", headers=h_lead)
    assert leave_res.status_code == 200
    assert leave_res.json().get("deleted") is True

    # ORM cascade on SQLite: Project, Tasks, Milestones, and ActivityLogs must be gone
    assert db.get(Project, proj_id) is None
    assert db.get(Milestone, UUID(m["id"])) is None
    assert db.get(Task, UUID(t["id"])) is None
    assert len(db.scalars(select(ActivityLog).where(ActivityLog.project_id == proj_id)).all()) == 0
