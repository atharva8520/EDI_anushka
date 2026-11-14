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


def test_profile_update_and_edge_cases(client):
    from app.models.skill import Skill
    import uuid
    test_client, db = client
    create_student(db, "updater@test.dev", "Original Name")
    skill1 = Skill(name="Python", category="Backend")
    db.add(skill1)
    db.commit()
    db.refresh(skill1)

    headers = auth_header(test_client, "updater@test.dev", "Student@123")

    # 1. Successful update with valid fields
    res = test_client.put(
        "/api/users/me",
        headers=headers,
        json={
            "full_name": "Updated Name",
            "college": "COEP",
            "branch": "CSE",
            "year": "Final Year",
            "bio": "Passionate developer",
            "github_url": "https://github.com/updated",
            "portfolio_url": "http://portfolio.dev",
            "availability": "flexible",
            "hackathon_experience": "2 hackathons",
            "preferred_roles": ["Backend", "AI/ML"],
            "domains": ["Healthcare", "Civic Tech"],
            "skills": [{"skill_id": str(skill1.id), "proficiency": "advanced"}],
            "previous_projects": [
                {
                    "title": "Project Alpha",
                    "description": "A cool project",
                    "tech_stack": "Python, React",
                    "year": 2024,
                }
            ],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Updated Name"
    assert data["college"] == "COEP"
    assert data["github_url"] == "https://github.com/updated"
    assert data["portfolio_url"] == "http://portfolio.dev"
    assert len(data["skills"]) == 1
    assert data["completion_percent"] > 50

    # 2. Invalid availability -> 422
    inv_avail = test_client.put(
        "/api/users/me",
        headers=headers,
        json={"availability": "anytime"},
    )
    assert inv_avail.status_code == 422

    # 3. Invalid URLs -> 422
    bad_gh = test_client.put(
        "/api/users/me",
        headers=headers,
        json={"github_url": "github.com/missing-protocol"},
    )
    assert bad_gh.status_code == 422

    bad_port = test_client.put(
        "/api/users/me",
        headers=headers,
        json={"portfolio_url": "ftp://bad-protocol"},
    )
    assert bad_port.status_code == 422

    # 4. Empty string URL -> 200 clears URL
    clear_url = test_client.put(
        "/api/users/me",
        headers=headers,
        json={"github_url": "", "portfolio_url": ""},
    )
    assert clear_url.status_code == 200
    assert clear_url.json()["github_url"] == "" or clear_url.json()["github_url"] is None

    # 5. Duplicate skill_id -> 400
    dup_res = test_client.put(
        "/api/users/me",
        headers=headers,
        json={
            "full_name": "Should Not Change",
            "skills": [
                {"skill_id": str(skill1.id), "proficiency": "beginner"},
                {"skill_id": str(skill1.id), "proficiency": "advanced"},
            ],
        },
    )
    assert dup_res.status_code == 400
    assert "duplicate" in dup_res.json()["detail"].lower()

    # 6. Unknown skill_id -> 400
    unknown_res = test_client.put(
        "/api/users/me",
        headers=headers,
        json={
            "full_name": "Should Not Change",
            "skills": [
                {"skill_id": str(uuid.uuid4()), "proficiency": "beginner"}
            ],
        },
    )
    assert unknown_res.status_code == 400
    assert "not exist" in unknown_res.json()["detail"].lower()

    # 7. Confirm rejected requests left existing profile unchanged
    me_res = test_client.get("/api/users/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["full_name"] == "Updated Name"

    # 8. Duplicate preferred roles and domains (repeats with whitespace & casing) -> 200 and deduplicated
    dedup_res = test_client.put(
        "/api/users/me",
        headers=headers,
        json={
            "preferred_roles": ["Backend", "backend", " Backend ", "AI/ML"],
            "domains": ["Healthcare", "healthcare", " Healthcare ", "FinTech"],
        },
    )
    assert dedup_res.status_code == 200
    assert dedup_res.json()["preferred_roles"] == ["Backend", "AI/ML"]
    assert dedup_res.json()["domains"] == ["Healthcare", "FinTech"]



