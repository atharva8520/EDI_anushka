import time
from datetime import date, timedelta
from uuid import UUID

from app.models.hackathon import Hackathon, HackathonProblem, HackathonStatus
from app.models.project import ChecklistItem, Milestone, Project, Task
from tests.factories import auth_header, create_admin, create_student


def make_custom_hackathon(db, name: str, slug: str) -> Hackathon:
    today = date.today()
    h = Hackathon(
        name=name,
        slug=slug,
        description="A sufficiently long description for validation and testing.",
        short_description="Short description of the test hackathon event.",
        organizer="Org",
        start_date=today + timedelta(days=2),
        end_date=today + timedelta(days=4),
        registration_deadline=today + timedelta(days=1),
        location="Pune",
        team_size_min=2,
        team_size_max=4,
        rules="Be excellent.",
        status=HackathonStatus.published,
        problems=[
            HackathonProblem(
                title=f"{name} Problem",
                code=f"P-{slug[:6].upper()}",
                domain="AI",
                statement="Problem statement text",
                description="Problem description text",
                target_users="Students",
                constraints="None",
                expected_outcome="Working solution",
                evaluation_criteria="Code quality",
                is_published=True,
            )
        ],
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


def test_student_can_lead_in_one_hackathon_and_be_member_in_another(client):
    test_client, db = client
    h1 = make_custom_hackathon(db, "Hackathon Alpha", "hackathon-alpha")
    h2 = make_custom_hackathon(db, "Hackathon Beta", "hackathon-beta")

    student1 = create_student(db, "dual_lead@test.dev", "Dual Lead")
    student2 = create_student(db, "peer_lead@test.dev", "Peer Lead")
    h_s1 = auth_header(test_client, "dual_lead@test.dev", "Student@123")
    h_s2 = auth_header(test_client, "peer_lead@test.dev", "Student@123")

    # S1 creates and leads Team A in Hackathon 1
    t1_res = test_client.post(
        "/api/teams",
        headers=h_s1,
        json={"hackathon_id": str(h1.id), "name": "Team A - Lead", "member_role": "Team Lead"},
    )
    assert t1_res.status_code == 201
    t1_data = t1_res.json()
    assert t1_data["is_leader"] is True

    # S2 creates Team B in Hackathon 2
    t2_res = test_client.post(
        "/api/teams",
        headers=h_s2,
        json={"hackathon_id": str(h2.id), "name": "Team B - Member", "member_role": "Team Lead"},
    )
    assert t2_res.status_code == 201
    t2_code = t2_res.json()["invite_code"]

    # S1 joins Team B in Hackathon 2 as a plain member
    join_res = test_client.post(
        "/api/teams/join",
        headers=h_s1,
        json={"invite_code": t2_code, "member_role": "Backend Dev"},
    )
    assert join_res.status_code == 200
    join_data = join_res.json()
    assert join_data["is_leader"] is False

    # Check /teams/mine/all for S1: returns both teams
    all_teams_res = test_client.get("/api/teams/mine/all", headers=h_s1)
    assert all_teams_res.status_code == 200
    teams_list = all_teams_res.json()
    assert len(teams_list) == 2
    t_roles = {t["id"]: t["is_leader"] for t in teams_list}
    assert t_roles[t1_data["id"]] is True
    assert t_roles[join_data["id"]] is False


def test_tiebreaker_ordering_and_mine_all_shape(client):
    test_client, db = client
    h1 = make_custom_hackathon(db, "Hack One", "hack-one")
    h2 = make_custom_hackathon(db, "Hack Two", "hack-two")
    h3 = make_custom_hackathon(db, "Hack Three", "hack-three")

    user = create_student(db, "multi_joiner@test.dev", "Multi Joiner")
    h_user = auth_header(test_client, "multi_joiner@test.dev", "Student@123")

    # Join Team 1 at t0
    t1 = test_client.post(
        "/api/teams",
        headers=h_user,
        json={"hackathon_id": str(h1.id), "name": "Team First", "member_role": "Team Lead"},
    ).json()

    time.sleep(0.05)
    # Join Team 2 at t1
    t2 = test_client.post(
        "/api/teams",
        headers=h_user,
        json={"hackathon_id": str(h2.id), "name": "Team Second", "member_role": "Team Lead"},
    ).json()

    time.sleep(0.05)
    # Join Team 3 at t2
    t3 = test_client.post(
        "/api/teams",
        headers=h_user,
        json={"hackathon_id": str(h3.id), "name": "Team Third", "member_role": "Team Lead"},
    ).json()

    # /teams/mine without ?team= must return Team 3 (most recently joined)
    mine_res = test_client.get("/api/teams/mine", headers=h_user)
    assert mine_res.status_code == 200
    assert mine_res.json()["team"]["id"] == t3["id"]

    # /teams/mine/all must be ordered t3, t2, t1
    all_res = test_client.get("/api/teams/mine/all", headers=h_user)
    assert all_res.status_code == 200
    all_list = all_res.json()
    assert [t["id"] for t in all_list] == [t3["id"], t2["id"], t1["id"]]

    # Verify shape of /teams/mine/all
    first_item = all_list[0]
    for field in [
        "id",
        "name",
        "invite_code",
        "hackathon_id",
        "hackathon_name",
        "leader_id",
        "leader_name",
        "is_leader",
        "member_role",
        "active_member_count",
        "team_size_min",
        "team_size_max",
        "is_ready",
        "is_full",
        "selected_problem",
        "created_at",
        "joined_at",
    ]:
        assert field in first_item

    # Verify NO emails in the response
    assert "email" not in first_item
    assert "email" not in all_res.text.lower()


def test_foreign_team_id_returns_404_on_teams_mine_and_projects_mine(client):
    test_client, db = client
    h1 = make_custom_hackathon(db, "Hack Foreign Test", "hack-foreign-test")
    u1 = create_student(db, "owner@test.dev", "Owner")
    u2 = create_student(db, "foreign@test.dev", "Foreign")
    h_u1 = auth_header(test_client, "owner@test.dev", "Student@123")
    h_u2 = auth_header(test_client, "foreign@test.dev", "Student@123")

    # u1 creates Team 1
    t1 = test_client.post(
        "/api/teams",
        headers=h_u1,
        json={"hackathon_id": str(h1.id), "name": "U1 Team", "member_role": "Team Lead"},
    ).json()

    # Select problem for Team 1
    test_client.post(
        f"/api/teams/{t1['id']}/problem",
        headers=h_u1,
        json={"problem_id": str(h1.problems[0].id)},
    )

    # Create project for Team 1
    proj = test_client.post(
        f"/api/teams/{t1['id']}/project",
        headers=h_u1,
        json={"title": "Team 1 Project"},
    ).json()
    assert "id" in proj

    # u2 tries to access u1's team via /teams/mine?team=<t1_id> -> 404
    foreign_team_get = test_client.get(f"/api/teams/mine?team={t1['id']}", headers=h_u2)
    assert foreign_team_get.status_code == 404

    # u2 tries to access u1's project via /projects/mine?team=<t1_id> -> 404
    foreign_proj_get = test_client.get(f"/api/projects/mine?team={t1['id']}", headers=h_u2)
    assert foreign_proj_get.status_code == 404

    # u1 accesses their own team with ?team=<t1_id> -> 200
    own_team_get = test_client.get(f"/api/teams/mine?team={t1['id']}", headers=h_u1)
    assert own_team_get.status_code == 200
    assert own_team_get.json()["team"]["id"] == t1["id"]

    # u1 accesses their own project with ?team=<t1_id> -> 200
    own_proj_get = test_client.get(f"/api/projects/mine?team={t1['id']}", headers=h_u1)
    assert own_proj_get.status_code == 200
    assert own_proj_get.json()["id"] == proj["id"]


def test_leaving_one_team_leaves_other_untouched(client):
    test_client, db = client
    h1 = make_custom_hackathon(db, "Hack Leave 1", "hack-leave-1")
    h2 = make_custom_hackathon(db, "Hack Leave 2", "hack-leave-2")

    lead1 = create_student(db, "l1@test.dev", "Leader 1")
    lead2 = create_student(db, "l2@test.dev", "Leader 2")
    member = create_student(db, "common_mem@test.dev", "Common Member")

    h_lead1 = auth_header(test_client, "l1@test.dev", "Student@123")
    h_lead2 = auth_header(test_client, "l2@test.dev", "Student@123")
    h_member = auth_header(test_client, "common_mem@test.dev", "Student@123")

    # Lead 1 creates Team 1 in Hackathon 1
    t1 = test_client.post(
        "/api/teams",
        headers=h_lead1,
        json={"hackathon_id": str(h1.id), "name": "Team One", "member_role": "Team Lead"},
    ).json()

    # Lead 2 creates Team 2 in Hackathon 2
    t2 = test_client.post(
        "/api/teams",
        headers=h_lead2,
        json={"hackathon_id": str(h2.id), "name": "Team Two", "member_role": "Team Lead"},
    ).json()

    # Member joins both teams
    test_client.post(
        "/api/teams/join",
        headers=h_member,
        json={"invite_code": t1["invite_code"], "member_role": "Member"},
    )
    test_client.post(
        "/api/teams/join",
        headers=h_member,
        json={"invite_code": t2["invite_code"], "member_role": "Member"},
    )

    # Lead 2 selects problem and creates project for Team 2 with tasks and checklist
    test_client.post(
        f"/api/teams/{t2['id']}/problem",
        headers=h_lead2,
        json={"problem_id": str(h2.problems[0].id)},
    )

    proj2 = test_client.post(
        f"/api/teams/{t2['id']}/project",
        headers=h_lead2,
        json={"title": "Project 2"},
    ).json()
    assert "id" in proj2

    task2 = test_client.post(
        f"/api/projects/{proj2['id']}/tasks",
        headers=h_lead2,
        json={"title": "Task in Team 2", "assignee_id": str(member.id)},
    ).json()

    item2 = test_client.post(
        f"/api/projects/{proj2['id']}/checklist",
        headers=h_lead2,
        json={"title": "Checklist in Team 2", "assignee_id": str(member.id)},
    ).json()

    # Member leaves Team 1
    leave_res = test_client.post(f"/api/teams/{t1['id']}/leave", headers=h_member)
    assert leave_res.status_code == 200

    # Member's active teams now only contains Team 2
    mine_all = test_client.get("/api/teams/mine/all", headers=h_member).json()
    assert len(mine_all) == 1
    assert mine_all[0]["id"] == t2["id"]

    # Team 2's tasks and checklist items remain untouched
    tasks2 = test_client.get(f"/api/projects/{proj2['id']}/tasks", headers=h_lead2).json()
    assert any(t["id"] == task2["id"] for t in tasks2)

    checklist2 = test_client.get(f"/api/projects/{proj2['id']}/checklist", headers=h_lead2).json()
    assert any(c["id"] == item2["id"] for c in checklist2)


def test_students_search_with_team_id_permissions(client):
    test_client, db = client
    h1 = make_custom_hackathon(db, "Hack Search 1", "hack-search-1")
    u1 = create_student(db, "t_member@test.dev", "Team Member")
    u2 = create_student(db, "non_member@test.dev", "Non Member")
    candidate = create_student(db, "candidate@test.dev", "Candidate")

    h_u1 = auth_header(test_client, "t_member@test.dev", "Student@123")
    h_u2 = auth_header(test_client, "non_member@test.dev", "Student@123")

    t1 = test_client.post(
        "/api/teams",
        headers=h_u1,
        json={"hackathon_id": str(h1.id), "name": "Squad A", "member_role": "Team Lead"},
    ).json()

    # u2 tries /students?team_id=<t1_id> -> 403 Forbidden
    forb_res = test_client.get(f"/api/students?team_id={t1['id']}", headers=h_u2)
    assert forb_res.status_code == 403
    assert "not belong" in forb_res.json()["detail"].lower()

    # u1 calls /students?team_id=<t1_id> -> 200 OK
    ok_res = test_client.get(f"/api/students?team_id={t1['id']}", headers=h_u1)
    assert ok_res.status_code == 200
    candidate_ids = [c["id"] for c in ok_res.json()]
    assert str(candidate.id) in candidate_ids


def test_two_invites_in_different_hackathons_both_accepted(client):
    test_client, db = client
    h1 = make_custom_hackathon(db, "Hack Inv 1", "hack-inv-1")
    h2 = make_custom_hackathon(db, "Hack Inv 2", "hack-inv-2")

    lead1 = create_student(db, "inv_lead1@test.dev", "Lead 1")
    lead2 = create_student(db, "inv_lead2@test.dev", "Lead 2")
    lead3 = create_student(db, "inv_lead3@test.dev", "Lead 3")
    invitee = create_student(db, "target_invitee@test.dev", "Target Invitee")

    h_lead1 = auth_header(test_client, "inv_lead1@test.dev", "Student@123")
    h_lead2 = auth_header(test_client, "inv_lead2@test.dev", "Student@123")
    h_lead3 = auth_header(test_client, "inv_lead3@test.dev", "Student@123")
    h_invitee = auth_header(test_client, "target_invitee@test.dev", "Student@123")

    t1 = test_client.post(
        "/api/teams",
        headers=h_lead1,
        json={"hackathon_id": str(h1.id), "name": "Hack 1 Team A", "member_role": "Team Lead"},
    ).json()

    t2 = test_client.post(
        "/api/teams",
        headers=h_lead2,
        json={"hackathon_id": str(h2.id), "name": "Hack 2 Team", "member_role": "Team Lead"},
    ).json()

    t3_same_h1 = test_client.post(
        "/api/teams",
        headers=h_lead3,
        json={"hackathon_id": str(h1.id), "name": "Hack 1 Team B", "member_role": "Team Lead"},
    ).json()

    # Lead 1 invites Invitee to Hack 1 Team A
    inv1 = test_client.post(
        f"/api/teams/{t1['id']}/invites",
        headers=h_lead1,
        json={"email": "target_invitee@test.dev"},
    ).json()

    # Lead 2 invites Invitee to Hack 2 Team
    inv2 = test_client.post(
        f"/api/teams/{t2['id']}/invites",
        headers=h_lead2,
        json={"email": "target_invitee@test.dev"},
    ).json()

    # Lead 3 invites Invitee to Hack 1 Team B
    inv3 = test_client.post(
        f"/api/teams/{t3_same_h1['id']}/invites",
        headers=h_lead3,
        json={"email": "target_invitee@test.dev"},
    ).json()

    # Invitee accepts invite 1 (Hack 1) -> Success
    acc1 = test_client.post(f"/api/invites/{inv1['id']}/respond?accept=true", headers=h_invitee)
    assert acc1.status_code == 200

    # Invitee accepts invite 2 (Hack 2) -> Success (different hackathon!)
    acc2 = test_client.post(f"/api/invites/{inv2['id']}/respond?accept=true", headers=h_invitee)
    assert acc2.status_code == 200

    # Invitee tries to accept invite 3 (Hack 1) -> 409 Rejected (already in a team in Hack 1!)
    acc3 = test_client.post(f"/api/invites/{inv3['id']}/respond?accept=true", headers=h_invitee)
    assert acc3.status_code == 409
    assert "leave your current team" in acc3.json()["detail"].lower()


def test_rejoining_reactivates_joined_at_and_becomes_default(client):
    test_client, db = client
    h1 = make_custom_hackathon(db, "Hack Rejoin 1", "hack-rejoin-1")
    h2 = make_custom_hackathon(db, "Hack Rejoin 2", "hack-rejoin-2")

    lead1 = create_student(db, "rejoin_lead1@test.dev", "Lead 1")
    lead2 = create_student(db, "rejoin_lead2@test.dev", "Lead 2")
    member = create_student(db, "rejoin_member@test.dev", "Rejoiner")

    h_lead1 = auth_header(test_client, "rejoin_lead1@test.dev", "Student@123")
    h_lead2 = auth_header(test_client, "rejoin_lead2@test.dev", "Student@123")
    h_member = auth_header(test_client, "rejoin_member@test.dev", "Student@123")

    t1 = test_client.post(
        "/api/teams",
        headers=h_lead1,
        json={"hackathon_id": str(h1.id), "name": "Team Uno", "member_role": "Team Lead"},
    ).json()

    t2 = test_client.post(
        "/api/teams",
        headers=h_lead2,
        json={"hackathon_id": str(h2.id), "name": "Team Dos", "member_role": "Team Lead"},
    ).json()

    # Member joins Team 1 first
    test_client.post(
        "/api/teams/join",
        headers=h_member,
        json={"invite_code": t1["invite_code"], "member_role": "Member"},
    )

    time.sleep(0.05)
    # Member joins Team 2 second -> Team 2 is now the default
    test_client.post(
        "/api/teams/join",
        headers=h_member,
        json={"invite_code": t2["invite_code"], "member_role": "Member"},
    )
    mine1 = test_client.get("/api/teams/mine", headers=h_member).json()
    assert mine1["team"]["id"] == t2["id"]

    # Member leaves Team 1
    test_client.post(f"/api/teams/{t1['id']}/leave", headers=h_member)

    time.sleep(0.05)
    # Member rejoins Team 1 via invite code
    rejoin_res = test_client.post(
        "/api/teams/join",
        headers=h_member,
        json={"invite_code": t1["invite_code"], "member_role": "Member"},
    )
    assert rejoin_res.status_code == 200

    # Team 1's joined_at was refreshed to now, so Team 1 is now the default team!
    mine2 = test_client.get("/api/teams/mine", headers=h_member).json()
    assert mine2["team"]["id"] == t1["id"]


def test_admin_participants_lists_all_active_teams_comma_separated(client):
    test_client, db = client
    h1 = make_custom_hackathon(db, "Hack Admin Part 1", "hack-admin-part-1")
    h2 = make_custom_hackathon(db, "Hack Admin Part 2", "hack-admin-part-2")

    admin = create_admin(db)
    student = create_student(db, "poly_student@test.dev", "Poly Student")

    h_admin = auth_header(test_client, "admin@test.dev", "Admin@12345")
    h_student = auth_header(test_client, "poly_student@test.dev", "Student@123")

    # Student joins Team Alpha (Hack 1)
    test_client.post(
        "/api/teams",
        headers=h_student,
        json={"hackathon_id": str(h1.id), "name": "Alpha Squad", "member_role": "Team Lead"},
    )

    time.sleep(0.05)
    # Student joins Team Beta (Hack 2)
    test_client.post(
        "/api/teams",
        headers=h_student,
        json={"hackathon_id": str(h2.id), "name": "Beta Squad", "member_role": "Team Lead"},
    )

    # Admin requests /admin/participants
    res = test_client.get("/api/admin/participants?q=Poly", headers=h_admin)
    assert res.status_code == 200
    participants = res.json()
    assert len(participants) == 1
    p = participants[0]
    assert p["team_name"] == "Beta Squad, Alpha Squad"


def test_dashboard_active_members_count_and_multi_team_links(client):
    test_client, db = client
    h1 = make_custom_hackathon(db, "Hack Dash 1", "hack-dash-1")
    h2 = make_custom_hackathon(db, "Hack Dash 2", "hack-dash-2")

    student = create_student(db, "dash_tester@test.dev", "Dashboard Tester")
    mem2 = create_student(db, "mem2@test.dev", "Member Two")
    mem_left = create_student(db, "mem_left@test.dev", "Member Left")

    h_student = auth_header(test_client, "dash_tester@test.dev", "Student@123")
    h_mem2 = auth_header(test_client, "mem2@test.dev", "Student@123")
    h_left = auth_header(test_client, "mem_left@test.dev", "Student@123")

    # Student creates Team 1 in Hack 1
    t1 = test_client.post(
        "/api/teams",
        headers=h_student,
        json={"hackathon_id": str(h1.id), "name": "Dash Team 1", "member_role": "Team Lead"},
    ).json()

    # mem2 and mem_left join Team 1
    test_client.post(
        "/api/teams/join",
        headers=h_mem2,
        json={"invite_code": t1["invite_code"], "member_role": "Member"},
    )
    test_client.post(
        "/api/teams/join",
        headers=h_left,
        json={"invite_code": t1["invite_code"], "member_role": "Member"},
    )

    # mem_left leaves Team 1 -> Active members count should be 2, total members in DB is 3
    test_client.post(f"/api/teams/{t1['id']}/leave", headers=h_left)

    # With only ONE active team:
    dash1 = test_client.get("/api/dashboard", headers=h_student).json()
    assert dash1["active"]["member_count"] == 2
    # Single team: links remain without ?team=
    assert dash1["active"]["team_link"] == "/app/team"
    assert dash1["active"]["workspace_link"] == "/app/workspace"

    time.sleep(0.05)
    # Student now creates Team 2 in Hack 2 -> Now has TWO active teams
    t2 = test_client.post(
        "/api/teams",
        headers=h_student,
        json={"hackathon_id": str(h2.id), "name": "Dash Team 2", "member_role": "Team Lead"},
    ).json()

    # With MULTIPLE active teams:
    dash2 = test_client.get("/api/dashboard", headers=h_student).json()
    assert len(dash2["active_teams"]) == 2
    # Primary team is Team 2 (most recently joined)
    assert dash2["active"]["team_id"] == t2["id"]
    # Links must have ?team=
    assert dash2["active"]["team_link"] == f"/app/team?team={t2['id']}"
    assert dash2["active"]["workspace_link"] == f"/app/workspace?team={t2['id']}"
    assert dash2["active_teams"][1]["team_link"] == f"/app/team?team={t1['id']}"
    assert dash2["active_teams"][1]["workspace_link"] == f"/app/workspace?team={t1['id']}"
