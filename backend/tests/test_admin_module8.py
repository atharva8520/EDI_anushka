import uuid
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

import pytest
from app.core.security import create_access_token
from app.models.hackathon import Hackathon, HackathonDomain, HackathonProblem, HackathonStatus, JudgingCriterion
from app.models.project import Project, Task, TaskPriority, TaskStatus
from app.models.team import MemberStatus, Team, TeamMember, TeamProblemSelection
from app.models.user import User, UserRole
from tests.factories import create_admin, create_student


def auth_header(client, email: str, password: str = "Student@123") -> dict[str, str]:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def make_admin(db, email="admin@test.dev") -> User:
    admin = db.query(User).filter(User.email == email).first()
    if not admin:
        from app.core.security import hash_password
        from app.models.profile import Profile
        admin = User(
            email=email,
            password_hash=hash_password("Admin@12345"),
            full_name="Admin User",
            role=UserRole.admin,
        )
        admin.profile = Profile()
        db.add(admin)
        db.commit()
        db.refresh(admin)
    return admin


# =========================================================================
# Case 1: Route uniqueness (no duplicate method + path)
# =========================================================================

def test_admin_route_uniqueness():
    from app.main import app
    routes_seen = set()
    for route in app.routes:
        methods = getattr(route, "methods", None)
        path = getattr(route, "path", None)
        if methods and path:
            for m in methods:
                if m in {"HEAD", "OPTIONS"}:
                    continue
                key = (m, path)
                assert key not in routes_seen, f"Duplicate route registered: {key}"
                routes_seen.add(key)


# =========================================================================
# Case 2: Admin permissions (401 anon, 403 student, 200 admin)
# =========================================================================

def test_admin_endpoint_permissions(client):
    test_client, db = client
    student = create_student(db, "student_perm@test.dev", "Student Perm")
    admin = make_admin(db, "admin_perm@test.dev")

    stu_headers = auth_header(test_client, "student_perm@test.dev", "Student@123")
    adm_headers = auth_header(test_client, "admin_perm@test.dev", "Admin@12345")

    endpoints = [
        ("GET", "/api/admin/teams"),
        ("GET", "/api/admin/participants"),
        ("GET", "/api/admin/activity"),
    ]

    for method, path in endpoints:
        # Anonymous -> 401
        res_anon = test_client.request(method, path)
        assert res_anon.status_code == 401, f"{path} anon expected 401, got {res_anon.status_code}"

        # Student -> 403
        res_stu = test_client.request(method, path, headers=stu_headers)
        assert res_stu.status_code == 403, f"{path} student expected 403, got {res_stu.status_code}"

        # Admin -> 200
        res_adm = test_client.request(method, path, headers=adm_headers)
        assert res_adm.status_code == 200, f"{path} admin expected 200, got {res_adm.status_code}: {res_adm.text}"


# =========================================================================
# Case 3: Hackathon create & update validation
# =========================================================================

def test_hackathon_validation_rules(client):
    test_client, db = client
    admin = make_admin(db, "admin_val@test.dev")
    adm_headers = auth_header(test_client, "admin_val@test.dev", "Admin@12345")

    today = date.today()
    base_payload = {
        "name": "Val Hackathon",
        "description": "Validation test hackathon description that is long enough.",
        "short_description": "Short description valid.",
        "organizer": "Org",
        "start_date": str(today + timedelta(days=10)),
        "end_date": str(today + timedelta(days=12)),
        "registration_deadline": str(today + timedelta(days=9)),
        "location": "Pune",
        "team_size_min": 2,
        "team_size_max": 4,
        "rules": "Rules text",
        "domains": ["AI/ML", "Healthcare"],
        "criteria": [{"title": "Tech", "description": "Desc", "weight": 100}],
        "status": "draft",
    }

    # 1. team_size_min > team_size_max
    bad_size = dict(base_payload, team_size_min=5, team_size_max=3)
    r = test_client.post("/api/hackathons", headers=adm_headers, json=bad_size)
    assert r.status_code == 400
    assert "Maximum team size must be greater than or equal to minimum" in r.json()["detail"]

    # 2. end_date < start_date
    bad_dates = dict(base_payload, start_date=str(today + timedelta(days=12)), end_date=str(today + timedelta(days=10)))
    r = test_client.post("/api/hackathons", headers=adm_headers, json=bad_dates)
    assert r.status_code == 400
    assert "End date must be on or after start date" in r.json()["detail"]

    # 3. registration_deadline > end_date
    bad_reg = dict(base_payload, registration_deadline=str(today + timedelta(days=15)))
    r = test_client.post("/api/hackathons", headers=adm_headers, json=bad_reg)
    assert r.status_code == 400
    assert "Registration deadline must be on or before end date" in r.json()["detail"]

    # 4. criteria weights != 100 on create
    bad_weights = dict(base_payload, criteria=[
        {"title": "Crit 1", "description": "Desc 1", "weight": 40},
        {"title": "Crit 2", "description": "Desc 2", "weight": 50},
    ])
    r = test_client.post("/api/hackathons", headers=adm_headers, json=bad_weights)
    assert r.status_code == 400
    assert "90" in r.json()["detail"]

    # 5. domains trimmed and deduplicated case-insensitively
    dup_domains = dict(base_payload, domains=["  AI/ML  ", "ai/ml", "Healthcare"])
    r = test_client.post("/api/hackathons", headers=adm_headers, json=dup_domains)
    assert r.status_code == 201
    h_data = r.json()
    assert len(h_data["domains"]) == 2
    assert "AI/ML" in h_data["domains"]
    assert "Healthcare" in h_data["domains"]
    hid = h_data["id"]

    # 6. criteria weights != 100 on update
    r = test_client.put(f"/api/hackathons/{hid}", headers=adm_headers, json={
        "criteria": [
            {"title": "Crit A", "description": "Desc A", "weight": 60},
            {"title": "Crit B", "description": "Desc B", "weight": 60},
        ]
    })
    assert r.status_code == 400
    assert "120" in r.json()["detail"]


# =========================================================================
# Case 4: All-or-nothing PUT
# =========================================================================

def test_hackathon_all_or_nothing_update(client):
    test_client, db = client
    admin = make_admin(db, "admin_aon@test.dev")
    adm_headers = auth_header(test_client, "admin_aon@test.dev", "Admin@12345")

    today = date.today()
    created = test_client.post("/api/hackathons", headers=adm_headers, json={
        "name": "Original Name AON",
        "description": "Original description for all-or-nothing update test.",
        "short_description": "Short description original.",
        "organizer": "Org AON",
        "start_date": str(today + timedelta(days=5)),
        "end_date": str(today + timedelta(days=7)),
        "registration_deadline": str(today + timedelta(days=4)),
        "location": "Pune",
        "team_size_min": 2,
        "team_size_max": 4,
        "rules": "Original rules",
        "domains": ["AI/ML"],
        "criteria": [{"title": "Tech", "description": "Desc", "weight": 100}],
        "status": "draft",
    })
    assert created.status_code == 201
    hid = created.json()["id"]

    # Attempt PUT with a valid name change AND an invalid status transition (draft -> completed is illegal)
    put_res = test_client.put(f"/api/hackathons/{hid}", headers=adm_headers, json={
        "name": "Renamed But Should Rollback",
        "status": "completed",
    })
    assert put_res.status_code == 400
    assert "completed" in put_res.json()["detail"]

    # Verify that the hackathon in DB was completely untouched
    get_res = test_client.get(f"/api/hackathons/{hid}", headers=adm_headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Original Name AON"
    assert get_res.json()["status"] == "draft"


# =========================================================================
# Case 5: Team size shrinkage protection
# =========================================================================

def test_hackathon_team_size_shrinkage_protection(client):
    test_client, db = client
    admin = make_admin(db, "admin_shrink@test.dev")
    adm_headers = auth_header(test_client, "admin_shrink@test.dev", "Admin@12345")

    today = date.today()
    created = test_client.post("/api/hackathons", headers=adm_headers, json={
        "name": "Shrink Hackathon",
        "description": "Hackathon to test team size shrinkage protection.",
        "short_description": "Short description shrink.",
        "organizer": "Org Shrink",
        "start_date": str(today + timedelta(days=5)),
        "end_date": str(today + timedelta(days=7)),
        "registration_deadline": str(today + timedelta(days=4)),
        "location": "Pune",
        "team_size_min": 2,
        "team_size_max": 4,
        "rules": "Rules",
        "domains": ["FinTech"],
        "criteria": [{"title": "Tech", "description": "Desc", "weight": 100}],
        "status": "published",
    })
    hid = created.json()["id"]

    # Create team with 3 active members
    s1 = create_student(db, "s1_shrink@test.dev", "Student 1")
    s2 = create_student(db, "s2_shrink@test.dev", "Student 2")
    s3 = create_student(db, "s3_shrink@test.dev", "Student 3")
    lead_headers = auth_header(test_client, "s1_shrink@test.dev", "Student@123")

    t_res = test_client.post("/api/teams", headers=lead_headers, json={
        "hackathon_id": hid,
        "name": "Squad Three Members",
        "member_role": "Lead",
    })
    assert t_res.status_code == 201
    tid = t_res.json()["id"]

    # Add 2 more active members
    db.add(TeamMember(team_id=UUID(tid), user_id=s2.id, member_role="Member", status=MemberStatus.active))
    db.add(TeamMember(team_id=UUID(tid), user_id=s3.id, member_role="Member", status=MemberStatus.active))
    db.commit()

    # Attempt to lower team_size_max to 2 (below largest team size 3) -> 409
    shrink_res = test_client.put(f"/api/hackathons/{hid}", headers=adm_headers, json={
        "team_size_max": 2,
    })
    assert shrink_res.status_code == 409
    assert "3" in shrink_res.json()["detail"]


# =========================================================================
# Case 6: Status transitions & prerequisites (via /status and PUT)
# =========================================================================

def test_hackathon_status_transitions(client):
    test_client, db = client
    admin = make_admin(db, "admin_trans@test.dev")
    adm_headers = auth_header(test_client, "admin_trans@test.dev", "Admin@12345")

    today = date.today()
    created = test_client.post("/api/hackathons", headers=adm_headers, json={
        "name": "Transition Hackathon",
        "description": "Hackathon to test status transitions and prerequisites.",
        "short_description": "Short description trans.",
        "organizer": "Org Trans",
        "start_date": str(today + timedelta(days=5)),
        "end_date": str(today + timedelta(days=7)),
        "registration_deadline": str(today + timedelta(days=4)),
        "location": "Pune",
        "team_size_min": 2,
        "team_size_max": 4,
        "rules": "Rules",
        "domains": ["AI/ML"],
        "criteria": [{"title": "Tech", "description": "Desc", "weight": 100}],
        "status": "draft",
    })
    hid = created.json()["id"]

    # 1. Setting same status (draft -> draft) is harmless 200 no-op
    noop_res = test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "draft"})
    assert noop_res.status_code == 200

    # 2. Disallowed transition (draft -> active) -> 400 listing allowed statuses
    bad_trans = test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "active"})
    assert bad_trans.status_code == 400
    assert "published" in bad_trans.json()["detail"]
    assert "archived" in bad_trans.json()["detail"]

    # 3. Allowed: draft -> published (allowed with 0 problems)
    pub_res = test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "published"})
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"

    # 4. Moving to active with NO published problem -> 400
    act_no_prob = test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "active"})
    assert act_no_prob.status_code == 400
    assert "published problem" in act_no_prob.json()["detail"].lower()

    # Add an unpublished problem -> still rejected
    p1 = test_client.post(f"/api/hackathons/{hid}/problems", headers=adm_headers, json={
        "code": "PROB-01",
        "title": "Problem 1",
        "statement": "Detailed statement for problem 1 exceeding twenty characters.",
        "description": "Detailed description exceeding twenty characters.",
        "domain": "AI/ML",
        "target_users": "Users",
        "constraints": "Constraints",
        "expected_outcome": "Outcome",
        "evaluation_criteria": "Criteria",
        "is_published": False,
    })
    assert p1.status_code == 201
    prob_id = p1.json()["id"]

    act_unpub = test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "active"})
    assert act_unpub.status_code == 400

    # Publish the problem -> now published -> active succeeds!
    test_client.put(f"/api/problems/{prob_id}", headers=adm_headers, json={"is_published": True})

    act_ok = test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "active"})
    assert act_ok.status_code == 200
    assert act_ok.json()["status"] == "active"

    # 5. active -> completed (via PUT)
    comp_put = test_client.put(f"/api/hackathons/{hid}", headers=adm_headers, json={"status": "completed"})
    assert comp_put.status_code == 200
    assert comp_put.json()["status"] == "completed"

    # 6. completed -> archived
    arch_res = test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "archived"})
    assert arch_res.status_code == 200
    assert arch_res.json()["status"] == "archived"

    # 7. archived -> draft
    draft_res = test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "draft"})
    assert draft_res.status_code == 200
    assert draft_res.json()["status"] == "draft"

    # 8. published -> draft: allowed if 0 teams, rejected if teams exist
    test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "published"})
    # Currently 0 teams -> published -> draft succeeds
    to_draft_0 = test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "draft"})
    assert to_draft_0.status_code == 200

    # Back to published and create a team
    test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "published"})
    s_lead = create_student(db, "lead_trans@test.dev", "Lead Trans")
    lead_h = auth_header(test_client, "lead_trans@test.dev", "Student@123")
    test_client.post("/api/teams", headers=lead_h, json={
        "hackathon_id": hid,
        "name": "Squad Exists",
        "member_role": "Lead",
    })
    # Now published -> draft must be rejected with 400
    to_draft_with_teams = test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "draft"})
    assert to_draft_with_teams.status_code == 400
    assert "teams" in to_draft_with_teams.json()["detail"].lower()


# =========================================================================
# Case 7: Problem routes rules (409 checks)
# =========================================================================

def test_problem_routes_rules(client):
    test_client, db = client
    admin = make_admin(db, "admin_prob@test.dev")
    adm_headers = auth_header(test_client, "admin_prob@test.dev", "Admin@12345")

    today = date.today()
    created = test_client.post("/api/hackathons", headers=adm_headers, json={
        "name": "Problem Rules Hackathon",
        "description": "Hackathon to test problem statement rules and 409s.",
        "short_description": "Short description prob rules.",
        "organizer": "Org Prob",
        "start_date": str(today + timedelta(days=5)),
        "end_date": str(today + timedelta(days=7)),
        "registration_deadline": str(today + timedelta(days=4)),
        "location": "Pune",
        "team_size_min": 2,
        "team_size_max": 4,
        "rules": "Rules",
        "domains": ["AI/ML"],
        "criteria": [{"title": "Tech", "description": "Desc", "weight": 100}],
        "status": "draft",
    })
    hid = created.json()["id"]

    # 1. Create problem PROB-01
    prob_payload = {
        "code": "PROB-01",
        "title": "Problem 1",
        "statement": "Detailed statement for problem 1 exceeding twenty characters.",
        "description": "Detailed description exceeding twenty characters.",
        "domain": "AI/ML",
        "target_users": "Users",
        "constraints": "Constraints",
        "expected_outcome": "Outcome",
        "evaluation_criteria": "Criteria",
        "is_published": True,
    }
    p1 = test_client.post(f"/api/hackathons/{hid}/problems", headers=adm_headers, json=prob_payload)
    assert p1.status_code == 201
    p1_id = p1.json()["id"]

    # 2. Creating another problem with duplicate code (case-insensitive) -> 409
    dup_p = dict(prob_payload, code="prob-01", title="Another Title")
    r_dup = test_client.post(f"/api/hackathons/{hid}/problems", headers=adm_headers, json=dup_p)
    assert r_dup.status_code == 409
    assert "already exists" in r_dup.json()["detail"].lower()

    # 3. Create problem PROB-02
    p2 = test_client.post(f"/api/hackathons/{hid}/problems", headers=adm_headers, json=dict(prob_payload, code="PROB-02", title="Problem 2"))
    assert p2.status_code == 201
    p2_id = p2.json()["id"]

    # Renaming PROB-02 to PROB-01 -> 409
    r_rename_dup = test_client.put(f"/api/problems/{p2_id}", headers=adm_headers, json={"code": "prob-01"})
    assert r_rename_dup.status_code == 409

    # 4. Activate hackathon (requires >= 1 published problem, which we have)
    test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "published"})
    test_client.post(f"/api/hackathons/{hid}/status", headers=adm_headers, json={"status": "active"})

    # Delete p2 (PROB-01 remains published) -> succeeds
    del_p2 = test_client.delete(f"/api/problems/{p2_id}", headers=adm_headers)
    assert del_p2.status_code == 204

    # Deleting p1 would leave active hackathon with 0 published problems -> 409
    del_p1 = test_client.delete(f"/api/problems/{p1_id}", headers=adm_headers)
    assert del_p1.status_code == 409
    assert "active" in del_p1.json()["detail"].lower()

    # Unpublishing p1 would also leave active hackathon with 0 published problems -> 409
    unpub_p1 = test_client.put(f"/api/problems/{p1_id}", headers=adm_headers, json={"is_published": False})
    assert unpub_p1.status_code == 409

    # Add a team that selects p1
    s_lead = create_student(db, "lead_pselect@test.dev", "Lead PSelect")
    lead_h = auth_header(test_client, "lead_pselect@test.dev", "Student@123")
    t_res = test_client.post("/api/teams", headers=lead_h, json={
        "hackathon_id": hid,
        "name": "Squad P1 Select",
        "member_role": "Lead",
    })
    tid = t_res.json()["id"]
    test_client.post(f"/api/teams/{tid}/problem", headers=lead_h, json={"problem_id": p1_id})

    # Add another published problem p3 so p1 is not the only published problem
    p3 = test_client.post(f"/api/hackathons/{hid}/problems", headers=adm_headers, json=dict(prob_payload, code="PROB-03", title="Problem 3"))
    assert p3.status_code == 201

    # Now unpublishing p1 should still be rejected with 409 because a team selected it!
    unpub_selected = test_client.put(f"/api/problems/{p1_id}", headers=adm_headers, json={"is_published": False})
    assert unpub_selected.status_code == 409
    assert "already selected" in unpub_selected.json()["detail"].lower()


# =========================================================================
# Case 8: Admin teams filtering, pagination, lighter schema & query count
# =========================================================================

def test_admin_teams_filtering_pagination_and_query_count(client):
    from sqlalchemy import event

    test_client, db = client
    admin = make_admin(db, "admin_tlist@test.dev")
    adm_headers = auth_header(test_client, "admin_tlist@test.dev", "Admin@12345")

    today = date.today()
    h = Hackathon(
        name="Admin Teams Hackathon",
        slug="admin-teams-hack",
        description="Testing admin teams list and pagination.",
        short_description="Short desc.",
        organizer="Org",
        start_date=today + timedelta(days=10),
        end_date=today + timedelta(days=12),
        registration_deadline=today + timedelta(days=8),
        location="Pune",
        team_size_min=2,
        team_size_max=4,
        rules="Rules",
        status=HackathonStatus.published,
    )
    db.add(h)
    db.flush()

    prob = HackathonProblem(
        hackathon_id=h.id,
        code="ATP-01",
        title="Admin Team Problem",
        statement="Detailed statement for problem exceeding twenty characters.",
        description="Detailed description exceeding twenty characters.",
        domain="AI/ML",
        target_users="Users",
        constraints="None",
        expected_outcome="Outcome",
        evaluation_criteria="Criteria",
        is_published=True,
    )
    db.add(prob)
    db.flush()

    # Create 5 teams
    teams = []
    for i in range(5):
        leader = create_student(db, f"lead_tlist_{i}@test.dev", f"Leader {i}")
        t = Team(
            hackathon_id=h.id,
            name=f"Squad Alpha {i}",
            leader_id=leader.id,
            invite_code=f"ALPH{i:02d}",
        )
        db.add(t)
        db.flush()
        db.add(TeamMember(team_id=t.id, user_id=leader.id, member_role="Lead", status=MemberStatus.active))

        # Add project to even teams
        if i % 2 == 0:
            proj = Project(
                team_id=t.id,
                title=f"Project {i}",
                created_by=leader.id,
            )
            db.add(proj)
            db.flush()
            # 2 tasks: 1 completed, 1 todo
            db.add(Task(
                project_id=proj.id,
                title="Task 1",
                status=TaskStatus.completed,
                created_by=leader.id,
                completed_at=datetime.now(timezone.utc),
            ))
            db.add(Task(
                project_id=proj.id,
                title="Task 2",
                status=TaskStatus.todo,
                created_by=leader.id,
            ))
            # Also select problem
            db.add(TeamProblemSelection(team_id=t.id, problem_id=prob.id, selected_by=leader.id))

        teams.append(t)
    db.commit()

    # 1. Fetch first page with limit=2
    res_p1 = test_client.get(f"/api/admin/teams?hackathon_id={h.id}&limit=2&skip=0", headers=adm_headers)
    assert res_p1.status_code == 200
    assert res_p1.headers.get("X-Total-Count") == "5"
    data_p1 = res_p1.json()
    assert len(data_p1) == 2

    # Check lighter row schema fields on page 1 (teams[4] is most recent and has project)
    row4 = next(r for r in data_p1 if r["id"] == str(teams[4].id))
    expected_keys = {
        "id", "name", "hackathon_id", "hackathon_name", "leader_name",
        "member_count", "team_size_min", "team_size_max", "is_ready",
        "selected_problem_title", "has_project", "tasks_total",
        "tasks_completed", "percent_complete", "created_at",
    }
    assert set(row4.keys()) == expected_keys
    assert row4["has_project"] is True
    assert row4["tasks_total"] == 2
    assert row4["tasks_completed"] == 1
    assert row4["percent_complete"] == 50
    assert row4["selected_problem_title"] == "Admin Team Problem"
    # min_size is 2, team has 1 active member -> is_ready is False
    assert row4["is_ready"] is False

    # Check team without project (team 1)
    res_all = test_client.get(f"/api/admin/teams?hackathon_id={h.id}", headers=adm_headers)
    row1 = next(r for r in res_all.json() if r["id"] == str(teams[1].id))
    assert row1["has_project"] is False
    assert row1["tasks_total"] == 0
    assert row1["tasks_completed"] == 0
    assert row1["percent_complete"] == 0
    assert row1["selected_problem_title"] is None

    # Filter by name q
    res_q = test_client.get(f"/api/admin/teams?hackathon_id={h.id}&q=Alpha 3", headers=adm_headers)
    assert res_q.status_code == 200
    assert len(res_q.json()) == 1
    assert res_q.json()[0]["name"] == "Squad Alpha 3"

    # Query count efficiency check (grouped queries, no N+1)
    query_count = [0]
    def count_queries(conn, cursor, statement, parameters, context, executemany):
        query_count[0] += 1

    event.listen(db.bind, "before_cursor_execute", count_queries)
    try:
        query_count[0] = 0
        r_measured = test_client.get(f"/api/admin/teams?hackathon_id={h.id}", headers=adm_headers)
        assert r_measured.status_code == 200
        # Grouped query implementation executes a small, constant number of queries regardless of teams count
        assert query_count[0] <= 10
    finally:
        event.remove(db.bind, "before_cursor_execute", count_queries)


# =========================================================================
# Case 9: LIKE wildcard escaping in teams and participants q filter
# =========================================================================

def test_admin_teams_and_participants_like_wildcard_escaping(client):
    test_client, db = client
    admin = make_admin(db, "admin_like@test.dev")
    adm_headers = auth_header(test_client, "admin_like@test.dev", "Admin@12345")

    today = date.today()
    h = Hackathon(
        name="Wildcard Hackathon",
        slug="wildcard-hack",
        description="Testing wildcard escaping in search.",
        short_description="Short desc.",
        organizer="Org",
        start_date=today + timedelta(days=10),
        end_date=today + timedelta(days=12),
        registration_deadline=today + timedelta(days=8),
        location="Pune",
        team_size_min=2,
        team_size_max=4,
        rules="Rules",
        status=HackathonStatus.published,
    )
    db.add(h)
    db.flush()

    # User with literal '%' in name
    u_pct = create_student(db, "pct_user@test.dev", "100% Student")
    # User with normal name
    u_normal = create_student(db, "normal_user@test.dev", "Normal Student")

    # Team with literal '%' in name
    t_pct = Team(hackathon_id=h.id, name="Team 100%", leader_id=u_pct.id, invite_code="PCT01")
    t_normal = Team(hackathon_id=h.id, name="Team Regular", leader_id=u_normal.id, invite_code="NORM1")
    db.add(t_pct)
    db.add(t_normal)
    db.commit()

    # 1. Search teams with q="%" -> should ONLY match "Team 100%", NOT "Team Regular"
    res_t_pct = test_client.get("/api/admin/teams?q=%", headers=adm_headers)
    assert res_t_pct.status_code == 200
    names = [t["name"] for t in res_t_pct.json()]
    assert "Team 100%" in names
    assert "Team Regular" not in names

    # 2. Search participants with q="%" -> should ONLY match "100% Student", NOT "Normal Student"
    res_p_pct = test_client.get("/api/admin/participants?q=%", headers=adm_headers)
    assert res_p_pct.status_code == 200
    p_names = [p["full_name"] for p in res_p_pct.json()]
    assert "100% Student" in p_names
    assert "Normal Student" not in p_names


# =========================================================================
# Case 10: Admin team detail with NO emails
# =========================================================================

def test_admin_team_detail_no_emails(client):
    test_client, db = client
    admin = make_admin(db, "admin_tdetail@test.dev")
    adm_headers = auth_header(test_client, "admin_tdetail@test.dev", "Admin@12345")

    today = date.today()
    h = Hackathon(
        name="Team Detail Hackathon",
        slug="team-detail-hack",
        description="Testing team detail endpoint.",
        short_description="Short desc.",
        organizer="Org",
        start_date=today + timedelta(days=10),
        end_date=today + timedelta(days=12),
        registration_deadline=today + timedelta(days=8),
        location="Pune",
        team_size_min=2,
        team_size_max=4,
        rules="Rules",
        status=HackathonStatus.published,
    )
    db.add(h)
    db.flush()

    prob = HackathonProblem(
        hackathon_id=h.id,
        code="TDP-01",
        title="Detail Problem",
        statement="Detailed statement for problem exceeding twenty characters.",
        description="Detailed description exceeding twenty characters.",
        domain="AI/ML",
        target_users="Users",
        constraints="None",
        expected_outcome="Outcome",
        evaluation_criteria="Criteria",
        is_published=True,
    )
    db.add(prob)
    db.flush()

    leader = create_student(db, "lead_detail_secret@test.dev", "Lead Detail")
    member = create_student(db, "mem_detail_secret@test.dev", "Mem Detail")
    left_member = create_student(db, "left_detail_secret@test.dev", "Left Member")

    team = Team(hackathon_id=h.id, name="Squad Detail View", leader_id=leader.id, invite_code="DET01")
    db.add(team)
    db.flush()

    db.add(TeamMember(team_id=team.id, user_id=leader.id, member_role="Leader", status=MemberStatus.active))
    db.add(TeamMember(team_id=team.id, user_id=member.id, member_role="Developer", status=MemberStatus.active))
    db.add(TeamMember(team_id=team.id, user_id=left_member.id, member_role="Ex-Member", status=MemberStatus.left))

    db.add(TeamProblemSelection(team_id=team.id, problem_id=prob.id, selected_by=leader.id))

    proj = Project(team_id=team.id, title="Detail Project", created_by=leader.id)
    db.add(proj)
    db.flush()

    db.add(Task(project_id=proj.id, title="T1", status=TaskStatus.completed, created_by=leader.id))
    db.add(Task(project_id=proj.id, title="T2", status=TaskStatus.in_progress, created_by=leader.id))
    db.add(Task(project_id=proj.id, title="T3", status=TaskStatus.todo, created_by=leader.id))
    db.commit()

    # Hit detail endpoint
    res = test_client.get(f"/api/admin/teams/{team.id}", headers=adm_headers)
    assert res.status_code == 200
    data = res.json()

    # 1. 404 for unknown team
    r_404 = test_client.get(f"/api/admin/teams/{uuid.uuid4()}", headers=adm_headers)
    assert r_404.status_code == 404

    # 2. Check fields and strictly NO emails
    assert data["name"] == "Squad Detail View"
    assert data["hackathon_name"] == "Team Detail Hackathon"
    assert data["selected_problem"]["title"] == "Detail Problem"

    # Only ACTIVE members listed (leader + member = 2, left_member excluded)
    assert len(data["members"]) == 2
    raw_json_str = str(data)
    assert "secret@test.dev" not in raw_json_str
    assert "@" not in raw_json_str
    for m in data["members"]:
        assert "email" not in m
        assert "name" in m
        assert "is_leader" in m

    lead_m = next(m for m in data["members"] if m["name"] == "Lead Detail")
    assert lead_m["is_leader"] is True
    dev_m = next(m for m in data["members"] if m["name"] == "Mem Detail")
    assert dev_m["is_leader"] is False

    # Project summary
    ps = data["project_summary"]
    assert ps["task_counts"]["completed"] == 1
    assert ps["task_counts"]["in_progress"] == 1
    assert ps["task_counts"]["todo"] == 1
    assert ps["percent_complete"] == 33


# =========================================================================
# Case 11: Admin participants filtering and has_team definition
# =========================================================================

def test_admin_participants_filtering(client):
    test_client, db = client
    admin = make_admin(db, "admin_part@test.dev")
    adm_headers = auth_header(test_client, "admin_part@test.dev", "Admin@12345")

    today = date.today()
    h = Hackathon(
        name="Participants Hackathon",
        slug="part-hack",
        description="Testing participants filtering.",
        short_description="Short desc.",
        organizer="Org",
        start_date=today + timedelta(days=10),
        end_date=today + timedelta(days=12),
        registration_deadline=today + timedelta(days=8),
        location="Pune",
        team_size_min=2,
        team_size_max=4,
        rules="Rules",
        status=HackathonStatus.published,
    )
    db.add(h)
    db.flush()

    # Participant on a team
    u_teamed = create_student(db, "teamed@test.dev", "Teamed Student")
    u_teamed.college = "PICT"

    # Participant left a team (has_team should be False!)
    u_left = create_student(db, "left@test.dev", "Left Student")
    u_left.college = "COEP"

    # Participant with no team
    u_free = create_student(db, "free@test.dev", "Free Student")
    u_free.college = "PICT"

    team = Team(hackathon_id=h.id, name="Team Active Part", leader_id=u_teamed.id, invite_code="PART01")
    db.add(team)
    db.flush()

    db.add(TeamMember(team_id=team.id, user_id=u_teamed.id, member_role="Lead", status=MemberStatus.active))
    db.add(TeamMember(team_id=team.id, user_id=u_left.id, member_role="Member", status=MemberStatus.left))
    db.commit()

    # Filter has_team=true
    r_has_team = test_client.get("/api/admin/participants?has_team=true", headers=adm_headers)
    assert r_has_team.status_code == 200
    has_names = [p["full_name"] for p in r_has_team.json()]
    assert "Teamed Student" in has_names
    assert "Left Student" not in has_names
    assert "Free Student" not in has_names

    # Filter has_team=false
    r_no_team = test_client.get("/api/admin/participants?has_team=false", headers=adm_headers)
    assert r_no_team.status_code == 200
    no_names = [p["full_name"] for p in r_no_team.json()]
    assert "Teamed Student" not in no_names
    assert "Left Student" in no_names
    assert "Free Student" in no_names

    # Filter by college
    r_college = test_client.get("/api/admin/participants?college=COEP", headers=adm_headers)
    assert r_college.status_code == 200
    col_names = [p["full_name"] for p in r_college.json()]
    assert "Left Student" in col_names
    assert "Teamed Student" not in col_names


# =========================================================================
# Case 12: Admin activity endpoint (zero-filled series and aggregations)
# =========================================================================

def test_admin_activity_metrics(client):
    test_client, db = client
    admin = make_admin(db, "admin_act@test.dev")
    adm_headers = auth_header(test_client, "admin_act@test.dev", "Admin@12345")

    # 1. Validation on days parameter: 0 or 91 -> 422
    assert test_client.get("/api/admin/activity?days=0", headers=adm_headers).status_code == 422
    assert test_client.get("/api/admin/activity?days=91", headers=adm_headers).status_code == 422

    # 2. Valid days=7
    res = test_client.get("/api/admin/activity?days=7", headers=adm_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["days"] == 7
    series = data["series"]
    assert len(series) == 7

    # Dates are zero-filled ascending
    dates = [s["date"] for s in series]
    assert dates == sorted(dates)
    for day in series:
        assert "date" in day
        assert "new_students" in day
        assert "new_teams" in day
        assert "tasks_completed" in day

    # Per-hackathon metrics
    assert "hackathons" in data
    assert isinstance(data["hackathons"], list)
    if data["hackathons"]:
        h_row = data["hackathons"][0]
        expected_h_keys = {
            "id", "name", "status", "team_count", "participant_count",
            "ready_team_count", "teams_with_problem", "teams_with_project",
            "tasks_total", "tasks_completed"
        }
        assert set(h_row.keys()) == expected_h_keys
