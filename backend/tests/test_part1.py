from tests.factories import auth_header, create_admin, create_student, make_hackathon


def test_register_and_me(client):
    test_client, _ = client
    res = test_client.post(
        "/api/auth/register",
        json={
            "full_name": "New Builder",
            "email": "new@test.dev",
            "password": "Student@123",
            "confirm_password": "Student@123",
            "college": "PICT",
            "branch": "CSE-AI",
            "year": "TY",
        },
    )
    assert res.status_code == 201
    token = res.json()["access_token"]
    me = test_client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "new@test.dev"
    assert me.json()["completion_percent"] < 70


def test_login_rejects_bad_password(client):
    test_client, db = client
    create_student(db)
    res = test_client.post("/api/auth/login", json={"email": "stu@test.dev", "password": "wrongpass"})
    assert res.status_code == 401


def test_student_cannot_create_hackathon(client):
    test_client, db = client
    create_student(db)
    headers = auth_header(test_client, "stu@test.dev", "Student@123")
    res = test_client.post(
        "/api/hackathons",
        headers=headers,
        json={
            "name": "Should Fail",
            "description": "Students must not create official hackathons in this product.",
            "short_description": "Not allowed for students to publish events.",
            "organizer": "Nope",
            "start_date": "2026-10-01",
            "end_date": "2026-10-03",
            "registration_deadline": "2026-09-28",
            "location": "Pune",
            "team_size_min": 2,
            "team_size_max": 4,
            "rules": "n/a",
            "domains": ["AI"],
            "criteria": [{"title": "Tech", "description": "ok", "weight": 100}],
        },
    )
    assert res.status_code == 403


def test_admin_hackathon_crud_and_public_listing(client):
    test_client, db = client
    create_admin(db)
    headers = auth_header(test_client, "admin@test.dev", "Admin@12345")
    payload = {
        "name": "PulseForge HealthHack",
        "description": "A full description of an emergency coordination hackathon for students.",
        "short_description": "Build safer emergency coordination tools.",
        "organizer": "PulseForge",
        "start_date": "2026-10-01",
        "end_date": "2026-10-03",
        "registration_deadline": "2026-09-28",
        "location": "Pune",
        "team_size_min": 2,
        "team_size_max": 4,
        "rules": "Teams of 2-4. No fabricated clinical claims.",
        "domains": ["Healthcare", "AI/ML"],
        "criteria": [{"title": "Technical", "description": "Architecture quality", "weight": 100}],
        "status": "draft",
    }
    created = test_client.post("/api/hackathons", headers=headers, json=payload)
    assert created.status_code == 201, created.text
    hid = created.json()["id"]
    public = test_client.get("/api/hackathons")
    assert public.status_code == 200
    assert all(item["name"] != "PulseForge HealthHack" or item["status"] != "draft" for item in public.json())
    published = test_client.post(f"/api/hackathons/{hid}/status", headers=headers, json={"status": "published"})
    assert published.status_code == 200
    listed = test_client.get("/api/hackathons")
    assert any(item["id"] == hid for item in listed.json())


def test_team_create_join_and_problem_select(client):
    test_client, db = client
    create_student(db, "lead@test.dev", "Lead")
    create_student(db, "join@test.dev", "Joiner")
    hackathon = make_hackathon(db)
    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    created = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Signal Room", "member_role": "Lead"},
    )
    assert created.status_code == 201, created.text
    code = created.json()["invite_code"]
    join_headers = auth_header(test_client, "join@test.dev", "Student@123")
    joined = test_client.post("/api/teams/join", headers=join_headers, json={"invite_code": code, "member_role": "Frontend"})
    assert joined.status_code == 200
    assert len(joined.json()["members"]) == 2
    problem_id = str(hackathon.problems[0].id)
    selected = test_client.post(
        f"/api/teams/{created.json()['id']}/problem",
        headers=lead_headers,
        json={"problem_id": problem_id},
    )
    assert selected.status_code == 200
    assert selected.json()["selected_problem"]["id"] == problem_id


def test_dashboard_uses_real_profile_state(client):
    test_client, db = client
    create_student(db)
    headers = auth_header(test_client, "stu@test.dev", "Student@123")
    dash = test_client.get("/api/dashboard", headers=headers)
    assert dash.status_code == 200
    body = dash.json()
    assert body["next_action"]["href"] == "/app/profile"
    assert body["profile_completion"] < 80
