from datetime import date, timedelta
from uuid import uuid4
from app.models.hackathon import Hackathon, HackathonDomain, HackathonProblem, HackathonStatus, JudgingCriterion
from tests.factories import auth_header, create_admin, create_student


def create_test_hackathon(db, name="Test Hack", status=HackathonStatus.published, deadline_offset=1, domains=None):
    today = date.today()
    uid = uuid4().hex[:6]
    h = Hackathon(
        name=f"{name} {uid}",
        slug=f"{name.lower().replace(' ', '-')}-{uid}",
        description="A sufficiently long description for validation and testing.",
        short_description="Short description of the test hackathon event.",
        organizer="Org",
        start_date=today + timedelta(days=2),
        end_date=today + timedelta(days=4),
        registration_deadline=today + timedelta(days=deadline_offset),
        location="Pune",
        team_size_min=2,
        team_size_max=4,
        rules="Be excellent.",
        status=status,
        domains=[HackathonDomain(domain=d) for d in (domains or ["Healthcare"])],
        criteria=[JudgingCriterion(title="Technical", description="Depth", weight=100)],
        problems=[
            HackathonProblem(
                code="T-01",
                title="Capacity Map",
                statement="Hospitals cannot share live capacity during surges in a trustworthy way.",
                description="Build a coordination prototype for emergency capacity.",
                domain="Healthcare",
                target_users="Dispatchers",
                constraints="Partial data",
                expected_outcome="Working dashboard",
                evaluation_criteria="Usefulness",
                is_published=True,
            )
        ],
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


def test_registration_deadline_rules(client):
    test_client, db = client
    create_student(db, "leader1@test.dev", "Leader 1")
    create_student(db, "leader2@test.dev", "Leader 2")
    create_student(db, "leader3@test.dev", "Leader 3")
    create_student(db, "joiner@test.dev", "Joiner")

    today = date.today()

    # 1. Hackathon with deadline in the future
    h_future = create_test_hackathon(db, name="Future Hack", deadline_offset=5)

    lead1_headers = auth_header(test_client, "leader1@test.dev", "Student@123")
    res1 = test_client.post(
        "/api/teams",
        headers=lead1_headers,
        json={"hackathon_id": str(h_future.id), "name": "Team Future", "member_role": "Lead"},
    )
    assert res1.status_code == 201

    # 2. Hackathon with deadline today (deadline day allowed)
    h_today = create_test_hackathon(db, name="Today Hack", deadline_offset=0)

    lead2_headers = auth_header(test_client, "leader2@test.dev", "Student@123")
    res2 = test_client.post(
        "/api/teams",
        headers=lead2_headers,
        json={"hackathon_id": str(h_today.id), "name": "Team Today", "member_role": "Lead"},
    )
    assert res2.status_code == 201

    # 3. Hackathon with deadline in the past
    h_past = create_test_hackathon(db, name="Past Hack", deadline_offset=-1)

    lead3_headers = auth_header(test_client, "leader3@test.dev", "Student@123")
    res3 = test_client.post(
        "/api/teams",
        headers=lead3_headers,
        json={"hackathon_id": str(h_past.id), "name": "Team Past", "member_role": "Lead"},
    )
    assert res3.status_code == 400
    assert "Registration has closed for this hackathon" in res3.json()["detail"]

    # 4. Join by code after deadline still works
    # We set h_future deadline to past to verify joining an existing team after deadline
    h_future.registration_deadline = today - timedelta(days=2)
    db.commit()

    code = res1.json()["invite_code"]
    join_headers = auth_header(test_client, "joiner@test.dev", "Student@123")
    join_res = test_client.post(
        "/api/teams/join",
        headers=join_headers,
        json={"invite_code": code, "member_role": "Developer"},
    )
    assert join_res.status_code == 200
    assert len(join_res.json()["members"]) == 2


def test_select_problem_access_and_validation(client):
    test_client, db = client
    create_student(db, "lead@test.dev", "Team Lead")
    create_student(db, "member@test.dev", "Team Member")
    h1 = create_test_hackathon(db, name="Alpha Hackathon")

    # Add second problem which is unpublished
    unpub = HackathonProblem(
        hackathon_id=h1.id,
        code="UNPUB-01",
        title="Unpublished problem",
        statement="This problem is not published yet for students to pick.",
        description="Detailed description for testing unpublished validation.",
        domain="AI/ML",
        target_users="Engineers",
        constraints="None",
        expected_outcome="None",
        evaluation_criteria="None",
        is_published=False,
    )
    db.add(unpub)
    db.commit()

    # Second hackathon with its own problem
    h2 = create_test_hackathon(db, name="Beta Hackathon")

    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    member_headers = auth_header(test_client, "member@test.dev", "Student@123")

    # Lead creates team
    created = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(h1.id), "name": "Alpha Squad", "member_role": "Lead"},
    )
    assert created.status_code == 201
    team_id = created.json()["id"]

    # Member joins team
    joined = test_client.post(
        "/api/teams/join",
        headers=member_headers,
        json={"invite_code": created.json()["invite_code"], "member_role": "Frontend"},
    )
    assert joined.status_code == 200

    valid_problem_id = str(h1.problems[0].id)
    other_problem_id = str(h2.problems[0].id)
    unpub_problem_id = str(unpub.id)

    # 1. Non-leader gets 403
    res_non_leader = test_client.post(
        f"/api/teams/{team_id}/problem",
        headers=member_headers,
        json={"problem_id": valid_problem_id},
    )
    assert res_non_leader.status_code == 403
    assert "Only the team leader can select a problem" in res_non_leader.json()["detail"]

    # 2. Problem from another hackathon returns 400
    res_other = test_client.post(
        f"/api/teams/{team_id}/problem",
        headers=lead_headers,
        json={"problem_id": other_problem_id},
    )
    assert res_other.status_code == 400
    assert "Problem is not available for this hackathon" in res_other.json()["detail"]

    # 3. Unpublished problem returns 400
    res_unpub = test_client.post(
        f"/api/teams/{team_id}/problem",
        headers=lead_headers,
        json={"problem_id": unpub_problem_id},
    )
    assert res_unpub.status_code == 400
    assert "Problem is not available for this hackathon" in res_unpub.json()["detail"]

    # 4. Leader selects valid published problem successfully
    res_success = test_client.post(
        f"/api/teams/{team_id}/problem",
        headers=lead_headers,
        json={"problem_id": valid_problem_id},
    )
    assert res_success.status_code == 200
    assert res_success.json()["selected_problem"]["id"] == valid_problem_id


def test_hackathon_listing_filters_sorting_and_visibility(client):
    test_client, db = client
    create_admin(db)
    create_student(db, "student@test.dev", "Student")

    admin_headers = auth_header(test_client, "admin@test.dev", "Admin@12345")
    student_headers = auth_header(test_client, "student@test.dev", "Student@123")

    today = date.today()

    # Create published hackathon
    h_pub = create_test_hackathon(db, name="HealthTech Summit", status=HackathonStatus.published, domains=["Healthcare", "AI/ML"])
    h_pub.start_date = today + timedelta(days=10)

    # Create active hackathon
    h_act = create_test_hackathon(db, name="Climate Innovation Sprint", status=HackathonStatus.active, domains=["Climate"])
    h_act.start_date = today + timedelta(days=5)

    # Create draft hackathon
    h_draft = create_test_hackathon(db, name="Draft Secret Hackathon", status=HackathonStatus.draft, domains=["FinTech"])
    h_draft.start_date = today + timedelta(days=20)

    # Create archived hackathon
    h_arch = create_test_hackathon(db, name="Archived Past Event", status=HackathonStatus.archived, domains=["Education"])
    h_arch.start_date = today - timedelta(days=30)

    db.commit()

    # 1. Student visibility: Draft and Archived are hidden
    res_stu = test_client.get("/api/hackathons", headers=student_headers)
    assert res_stu.status_code == 200
    stu_names = [h["name"] for h in res_stu.json()]
    assert any("HealthTech Summit" in n for n in stu_names)
    assert any("Climate Innovation Sprint" in n for n in stu_names)
    assert not any("Draft Secret Hackathon" in n for n in stu_names)
    assert not any("Archived Past Event" in n for n in stu_names)
    assert res_stu.headers["X-Total-Count"] == "2"

    # 2. Admin visibility: Can see all statuses
    res_admin = test_client.get("/api/hackathons", headers=admin_headers)
    assert res_admin.status_code == 200
    admin_names = [h["name"] for h in res_admin.json()]
    assert any("Draft Secret Hackathon" in n for n in admin_names)
    assert any("Archived Past Event" in n for n in admin_names)
    assert int(res_admin.headers["X-Total-Count"]) >= 4

    # 3. Domain filter
    res_domain = test_client.get("/api/hackathons?domain=Climate", headers=student_headers)
    assert res_domain.status_code == 200
    assert len(res_domain.json()) == 1
    assert "Climate Innovation Sprint" in res_domain.json()[0]["name"]

    # 4. Search by name (q)
    res_q = test_client.get("/api/hackathons?q=healthtech", headers=student_headers)
    assert res_q.status_code == 200
    assert len(res_q.json()) == 1
    assert "HealthTech Summit" in res_q.json()[0]["name"]

    # 5. Date range filter on start_date
    from_iso = (today + timedelta(days=8)).isoformat()
    to_iso = (today + timedelta(days=12)).isoformat()
    res_date = test_client.get(
        f"/api/hackathons?from_date={from_iso}&to_date={to_iso}",
        headers=student_headers,
    )
    assert res_date.status_code == 200
    assert len(res_date.json()) == 1
    assert "HealthTech Summit" in res_date.json()[0]["name"]

    # 6. Sorting whitelist
    res_sort_asc = test_client.get("/api/hackathons?sort_by=start_date&order=asc", headers=student_headers)
    assert res_sort_asc.status_code == 200
    assert "Climate Innovation Sprint" in res_sort_asc.json()[0]["name"]

    # Invalid sort_by returns 422
    res_bad_sort = test_client.get("/api/hackathons?sort_by=invalid_field", headers=student_headers)
    assert res_bad_sort.status_code == 422

    # Invalid order returns 422
    res_bad_order = test_client.get("/api/hackathons?order=random", headers=student_headers)
    assert res_bad_order.status_code == 422

    # 7. Pagination with limit and skip
    res_page1 = test_client.get("/api/hackathons?limit=1&skip=0", headers=student_headers)
    assert res_page1.status_code == 200
    assert len(res_page1.json()) == 1
    assert res_page1.headers["X-Total-Count"] == "2"

    res_page2 = test_client.get("/api/hackathons?limit=1&skip=1", headers=student_headers)
    assert res_page2.status_code == 200
    assert len(res_page2.json()) == 1
    assert res_page1.json()[0]["id"] != res_page2.json()[0]["id"]
