import pytest
from app.models.hackathon import HackathonStatus
from app.models.team import InviteStatus, MemberStatus
from tests.factories import auth_header, create_admin, create_student, make_hackathon


def test_bug_a1_reinvite_after_decline(client):
    test_client, db = client
    leader = create_student(db, "lead@test.dev", "Lead Student")
    student = create_student(db, "target@test.dev", "Target Student")
    hackathon = make_hackathon(db)
    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    target_headers = auth_header(test_client, "target@test.dev", "Student@123")

    create_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Team Nova", "member_role": "Lead"},
    )
    assert create_res.status_code == 201
    team_id = create_res.json()["id"]

    inv1 = test_client.post(f"/api/teams/{team_id}/invites", headers=lead_headers, json={"email": "target@test.dev"})
    assert inv1.status_code == 201
    invite_id = inv1.json()["id"]

    dec = test_client.post(f"/api/invites/{invite_id}/respond?accept=false", headers=target_headers)
    assert dec.status_code == 200

    # BUG A.1: Fails with 500 / IntegrityError on unique constraint
    inv2 = test_client.post(f"/api/teams/{team_id}/invites", headers=lead_headers, json={"email": "target@test.dev"})
    assert inv2.status_code == 201
    assert inv2.json()["status"] == "pending"


def test_bug_a2_accept_invite_after_leaving(client):
    test_client, db = client
    leader = create_student(db, "lead@test.dev", "Lead")
    member = create_student(db, "mem@test.dev", "Member")
    hackathon = make_hackathon(db)
    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    mem_headers = auth_header(test_client, "mem@test.dev", "Student@123")

    create_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Team A2", "member_role": "Lead"},
    )
    team_id = create_res.json()["id"]
    code = create_res.json()["invite_code"]

    # Member joins with code
    j = test_client.post("/api/teams/join", headers=mem_headers, json={"invite_code": code, "member_role": "Member"})
    assert j.status_code == 200

    # Member leaves
    leave = test_client.post(f"/api/teams/{team_id}/leave", headers=mem_headers)
    assert leave.status_code == 200

    # Leader invites member
    inv = test_client.post(f"/api/teams/{team_id}/invites", headers=lead_headers, json={"email": "mem@test.dev"})
    assert inv.status_code == 201
    invite_id = inv.json()["id"]

    # Member accepts invite
    # BUG A.2: Fails with 500 / IntegrityError uq_team_member
    accept = test_client.post(f"/api/invites/{invite_id}/respond?accept=true", headers=mem_headers)
    assert accept.status_code == 200
    team_data = accept.json()
    assert any(m["user_id"] == str(member.id) for m in team_data["members"])


def test_bug_a3_respond_invite_checks_team_size_max(client):
    test_client, db = client
    lead = create_student(db, "lead@test.dev", "Lead")
    m1 = create_student(db, "m1@test.dev", "M1")
    m2 = create_student(db, "m2@test.dev", "M2")
    m3 = create_student(db, "m3@test.dev", "M3")
    hackathon = make_hackathon(db) # team_size_max = 4
    # let's set team_size_max to 2 to test easily
    hackathon.team_size_max = 2
    db.commit()

    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    m1_headers = auth_header(test_client, "m1@test.dev", "Student@123")
    m2_headers = auth_header(test_client, "m2@test.dev", "Student@123")

    c = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Team A3", "member_role": "Lead"},
    )
    team_id = c.json()["id"]

    # Leader invites m1 and m2
    i1 = test_client.post(f"/api/teams/{team_id}/invites", headers=lead_headers, json={"email": "m1@test.dev"}).json()["id"]
    i2 = test_client.post(f"/api/teams/{team_id}/invites", headers=lead_headers, json={"email": "m2@test.dev"}).json()["id"]

    # m1 accepts -> team has 2 active members (full)
    a1 = test_client.post(f"/api/invites/{i1}/respond?accept=true", headers=m1_headers)
    assert a1.status_code == 200

    # m2 accepts -> BUG A.3: Should fail with 409 and leave invite pending
    a2 = test_client.post(f"/api/invites/{i2}/respond?accept=true", headers=m2_headers)
    assert a2.status_code == 409
    assert "maximum size" in a2.json()["detail"].lower()

    # Verify invite is still pending
    my_invites = test_client.get("/api/invites", headers=m2_headers).json()
    assert any(inv["id"] == i2 and inv["status"] == "pending" for inv in my_invites)


def test_bug_a4_invite_member_blocks_when_full(client):
    test_client, db = client
    lead = create_student(db, "lead@test.dev", "Lead")
    m1 = create_student(db, "m1@test.dev", "M1")
    m2 = create_student(db, "m2@test.dev", "M2")
    hackathon = make_hackathon(db)
    hackathon.team_size_max = 2
    db.commit()

    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    m1_headers = auth_header(test_client, "m1@test.dev", "Student@123")

    c = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Team A4", "member_role": "Lead"},
    )
    team_id = c.json()["id"]
    code = c.json()["invite_code"]

    # m1 joins via code to fill the team
    test_client.post("/api/teams/join", headers=m1_headers, json={"invite_code": code, "member_role": "Member"})

    # Leader tries to invite m2 -> BUG A.4: Should fail with 409
    res = test_client.post(f"/api/teams/{team_id}/invites", headers=lead_headers, json={"email": "m2@test.dev"})
    assert res.status_code == 409
    assert "maximum size" in res.json()["detail"].lower()


def test_bug_a5_create_team_whitespace_and_case(client):
    test_client, db = client
    s1 = create_student(db, "s1@test.dev", "S1")
    s2 = create_student(db, "s2@test.dev", "S2")
    hackathon = make_hackathon(db)

    h1 = auth_header(test_client, "s1@test.dev", "Student@123")
    h2 = auth_header(test_client, "s2@test.dev", "Student@123")

    # S1 creates team "  Phoenix Squad  "
    c1 = test_client.post(
        "/api/teams",
        headers=h1,
        json={"hackathon_id": str(hackathon.id), "name": "  Phoenix Squad  ", "member_role": "Lead"},
    )
    assert c1.status_code == 201
    assert c1.json()["name"] == "Phoenix Squad"

    # S2 attempts to create "phoenix squad" (case-insensitive duplicate) -> BUG A.5: Should fail with 409
    c2 = test_client.post(
        "/api/teams",
        headers=h2,
        json={"hackathon_id": str(hackathon.id), "name": "phoenix squad", "member_role": "Lead"},
    )
    assert c2.status_code == 409


def test_bug_a6_leader_leaves_last_deletes_team(client):
    test_client, db = client
    lead = create_student(db, "lead@test.dev", "Lead")
    other = create_student(db, "other@test.dev", "Other")
    hackathon = make_hackathon(db)

    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    other_headers = auth_header(test_client, "other@test.dev", "Student@123")

    c = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Sole Team", "member_role": "Lead"},
    )
    team_id = c.json()["id"]
    code = c.json()["invite_code"]

    # Leader leaves
    leave = test_client.post(f"/api/teams/{team_id}/leave", headers=lead_headers)
    assert leave.status_code == 200

    # Team should be deleted or reject joining
    join_res = test_client.post(
        "/api/teams/join",
        headers=other_headers,
        json={"invite_code": code, "member_role": "Member"},
    )
    assert join_res.status_code in {400, 404}


def test_bug_a7_join_team_checks_hackathon_status(client):
    test_client, db = client
    lead = create_student(db, "lead@test.dev", "Lead")
    other = create_student(db, "other@test.dev", "Other")
    hackathon = make_hackathon(db, status=HackathonStatus.draft)

    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    other_headers = auth_header(test_client, "other@test.dev", "Student@123")

    # Manually create team in draft hackathon via DB for test setup
    from app.models.team import Team, TeamMember
    from app.services.ids import generate_invite_code
    t = Team(
        hackathon_id=hackathon.id,
        name="Draft Team",
        invite_code="DRAFT123",
        leader_id=lead.id,
        members=[TeamMember(user_id=lead.id, member_role="Lead", status=MemberStatus.active)],
    )
    db.add(t)
    db.commit()

    # BUG A.7: join_team on draft hackathon should return 400
    res = test_client.post(
        "/api/teams/join",
        headers=other_headers,
        json={"invite_code": "DRAFT123", "member_role": "Member"},
    )
    assert res.status_code == 400
    assert "published or active" in res.json()["detail"].lower()


def test_remove_member_features_and_permissions(client):
    test_client, db = client
    lead = create_student(db, "lead@test.dev", "Lead")
    m1 = create_student(db, "m1@test.dev", "Member1")
    hackathon = make_hackathon(db)

    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    m1_headers = auth_header(test_client, "m1@test.dev", "Student@123")

    c = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Alpha Team", "member_role": "Team Lead"},
    )
    team_id = c.json()["id"]
    code = c.json()["invite_code"]

    join_res = test_client.post("/api/teams/join", headers=m1_headers, json={"invite_code": code, "member_role": "Member"})
    assert join_res.status_code == 200
    m1_member_id = next(m["id"] for m in join_res.json()["members"] if m["user_id"] == str(m1.id))
    lead_member_id = next(m["id"] for m in join_res.json()["members"] if m["user_id"] == str(lead.id))

    # Non-leader cannot remove member (403)
    non_lead_remove = test_client.post(f"/api/teams/{team_id}/members/{m1_member_id}/remove", headers=m1_headers)
    assert non_lead_remove.status_code == 403

    # Leader cannot remove themselves (400)
    self_remove = test_client.post(f"/api/teams/{team_id}/members/{lead_member_id}/remove", headers=lead_headers)
    assert self_remove.status_code == 400
    assert "cannot remove the team lead" in self_remove.json()["detail"].lower()

    # Leader successfully removes member
    rem = test_client.post(f"/api/teams/{team_id}/members/{m1_member_id}/remove", headers=lead_headers)
    assert rem.status_code == 200
    team_data = rem.json()
    assert all(m["user_id"] != str(m1.id) for m in team_data["members"])
    assert team_data["active_member_count"] == 1


def test_transfer_leadership_features_and_permissions(client):
    test_client, db = client
    lead = create_student(db, "lead@test.dev", "Lead")
    m1 = create_student(db, "m1@test.dev", "Member1")
    hackathon = make_hackathon(db)

    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    m1_headers = auth_header(test_client, "m1@test.dev", "Student@123")

    c = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Beta Team", "member_role": "Team Lead"},
    )
    team_id = c.json()["id"]
    code = c.json()["invite_code"]

    join_res = test_client.post("/api/teams/join", headers=m1_headers, json={"invite_code": code, "member_role": "Member"})
    m1_member_id = next(m["id"] for m in join_res.json()["members"] if m["user_id"] == str(m1.id))
    lead_member_id = next(m["id"] for m in join_res.json()["members"] if m["user_id"] == str(lead.id))

    # Non-leader cannot transfer leadership (403)
    p403 = test_client.post(
        f"/api/teams/{team_id}/transfer-leadership",
        headers=m1_headers,
        json={"member_id": m1_member_id},
    )
    assert p403.status_code == 403

    # Leader cannot transfer to themselves (400)
    self_transfer = test_client.post(
        f"/api/teams/{team_id}/transfer-leadership",
        headers=lead_headers,
        json={"member_id": lead_member_id},
    )
    assert self_transfer.status_code == 400

    # Transfer to m1
    res = test_client.post(
        f"/api/teams/{team_id}/transfer-leadership",
        headers=lead_headers,
        json={"member_id": m1_member_id},
    )
    assert res.status_code == 200
    team_data = res.json()
    assert team_data["leader_id"] == str(m1.id)
    assert team_data["leader_name"] == m1.full_name
    m1_item = next(m for m in team_data["members"] if m["user_id"] == str(m1.id))
    lead_item = next(m for m in team_data["members"] if m["user_id"] == str(lead.id))
    assert m1_item["member_role"] == "Team Lead"
    assert lead_item["member_role"] == "Member"


def test_team_readiness_and_exclude_left_members(client):
    test_client, db = client
    lead = create_student(db, "lead@test.dev", "Lead")
    m1 = create_student(db, "m1@test.dev", "M1")
    hackathon = make_hackathon(db) # min=2, max=4
    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    m1_headers = auth_header(test_client, "m1@test.dev", "Student@123")

    c = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Ready Team", "member_role": "Team Lead"},
    )
    t = c.json()
    assert t["active_member_count"] == 1
    assert t["team_size_min"] == 2
    assert t["team_size_max"] == 4
    assert t["is_ready"] is False
    assert t["is_full"] is False

    # m1 joins
    j = test_client.post("/api/teams/join", headers=m1_headers, json={"invite_code": t["invite_code"], "member_role": "Member"}).json()
    assert j["active_member_count"] == 2
    assert j["is_ready"] is True
    assert j["is_full"] is False

    # m1 leaves
    test_client.post(f"/api/teams/{t['id']}/leave", headers=m1_headers)
    after_leave = test_client.get(f"/api/teams/{t['id']}", headers=lead_headers).json()
    assert after_leave["active_member_count"] == 1
    assert after_leave["is_ready"] is False
    assert len(after_leave["members"]) == 1
    assert all(m["user_id"] != str(m1.id) for m in after_leave["members"])


def test_invite_create_validation_and_by_id(client):
    test_client, db = client
    lead = create_student(db, "lead@test.dev", "Lead")
    target = create_student(db, "target@test.dev", "Target")
    hackathon = make_hackathon(db)
    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")

    c = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Invite Team", "member_role": "Team Lead"},
    )
    team_id = c.json()["id"]

    # Neither email nor invitee_id -> 422
    r_neither = test_client.post(f"/api/teams/{team_id}/invites", headers=lead_headers, json={})
    assert r_neither.status_code == 422

    # Both email and invitee_id -> 422
    r_both = test_client.post(
        f"/api/teams/{team_id}/invites",
        headers=lead_headers,
        json={"email": "target@test.dev", "invitee_id": str(target.id)},
    )
    assert r_both.status_code == 422

    # By invitee_id works
    r_id = test_client.post(
        f"/api/teams/{team_id}/invites",
        headers=lead_headers,
        json={"invitee_id": str(target.id)},
    )
    assert r_id.status_code == 201
    assert r_id.json()["status"] == "pending"


def test_list_team_invites_leader_only_no_email(client):
    test_client, db = client
    lead = create_student(db, "lead@test.dev", "Lead")
    target = create_student(db, "target@test.dev", "Target")
    other = create_student(db, "other@test.dev", "Other")
    hackathon = make_hackathon(db)

    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    other_headers = auth_header(test_client, "other@test.dev", "Student@123")

    c = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "List Inv Team", "member_role": "Team Lead"},
    )
    team_id = c.json()["id"]

    # Invite target
    test_client.post(f"/api/teams/{team_id}/invites", headers=lead_headers, json={"email": "target@test.dev"})

    # Non-leader cannot list team invites (403)
    p403 = test_client.get(f"/api/teams/{team_id}/invites", headers=other_headers)
    assert p403.status_code == 403

    # Leader lists team invites
    res = test_client.get(f"/api/teams/{team_id}/invites", headers=lead_headers)
    assert res.status_code == 200
    invites = res.json()
    assert len(invites) == 1
    assert invites[0]["invitee_name"] == "Target"
    assert invites[0]["status"] == "pending"
    assert "email" not in invites[0]
    assert "invitee_email" not in invites[0]


def test_student_search_and_security(client):
    test_client, db = client
    from app.models.profile import Availability, Profile, UserDomainInterest, UserSkill
    from app.models.skill import Skill

    s1 = create_student(db, "caller@test.dev", "Caller")
    s2 = create_student(db, "alice@test.dev", "Alice Smith")
    s3 = create_student(db, "bob@test.dev", "Bob Jones")
    admin = create_admin(db)

    # Attach skills, domain, availability to Alice
    sk = Skill(name="PyTorch", category="AI/ML")
    db.add(sk)
    db.commit()
    db.refresh(sk)

    s2.profile.availability = Availability.weekends
    s2.skills.append(UserSkill(skill_id=sk.id, proficiency="advanced"))
    s2.domains.append(UserDomainInterest(domain="Healthcare"))
    db.commit()

    caller_headers = auth_header(test_client, "caller@test.dev", "Student@123")
    admin_headers = auth_header(test_client, "admin@test.dev", "Admin@12345")

    # Admin cannot search students (403)
    assert test_client.get("/api/students", headers=admin_headers).status_code == 403

    # Student search
    res = test_client.get("/api/students", headers=caller_headers)
    assert res.status_code == 200
    assert "X-Total-Count" in res.headers
    items = res.json()
    # Caller must be excluded
    assert all(item["id"] != str(s1.id) for item in items)
    # Never return email!
    for item in items:
        assert "email" not in item

    # Filter by name q
    q_res = test_client.get("/api/students?q=alice", headers=caller_headers).json()
    assert len(q_res) == 1
    assert q_res[0]["full_name"] == "Alice Smith"

    # Filter by skill (case-insensitive)
    skill_res = test_client.get("/api/students?skill=pytorch", headers=caller_headers).json()
    assert len(skill_res) == 1
    assert skill_res[0]["full_name"] == "Alice Smith"

    # Filter by domain (case-insensitive)
    domain_res = test_client.get("/api/students?domain=healthcare", headers=caller_headers).json()
    assert len(domain_res) == 1
    assert domain_res[0]["full_name"] == "Alice Smith"

    # Filter by availability
    avail_res = test_client.get("/api/students?availability=weekends", headers=caller_headers).json()
    assert any(item["full_name"] == "Alice Smith" for item in avail_res)

    # Invalid availability -> 422
    bad_avail = test_client.get("/api/students?availability=never", headers=caller_headers)
    assert bad_avail.status_code == 422

    # Limit capped at 50 -> 422 if > 50
    bad_limit = test_client.get("/api/students?limit=51", headers=caller_headers)
    assert bad_limit.status_code == 422


def test_additional_permissions_and_amendments(client):
    test_client, db = client
    lead = create_student(db, "lead@test.dev", "Lead")
    member = create_student(db, "member@test.dev", "Member")
    outsider = create_student(db, "outsider@test.dev", "Outsider")
    admin = create_admin(db)
    hackathon = make_hackathon(db)

    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    mem_headers = auth_header(test_client, "member@test.dev", "Student@123")
    outsider_headers = auth_header(test_client, "outsider@test.dev", "Student@123")
    admin_headers = auth_header(test_client, "admin@test.dev", "Admin@12345")

    c = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Shield Team", "member_role": "Team Lead"},
    )
    team_id = c.json()["id"]

    # Outsider gets 403 on GET /api/teams/{id}
    out_get = test_client.get(f"/api/teams/{team_id}", headers=outsider_headers)
    assert out_get.status_code == 403

    # Admin cannot create team (403)
    admin_create = test_client.post(
        "/api/teams",
        headers=admin_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Admin Team", "member_role": "Lead"},
    )
    assert admin_create.status_code == 403

    # Invite member
    inv_res = test_client.post(f"/api/teams/{team_id}/invites", headers=lead_headers, json={"email": "member@test.dev"})
    inv_id = inv_res.json()["id"]

    # Outsider cannot respond to member's invite (404)
    out_resp = test_client.post(f"/api/invites/{inv_id}/respond?accept=true", headers=outsider_headers)
    assert out_resp.status_code == 404

    # Member accepts invite
    mem_accept = test_client.post(f"/api/invites/{inv_id}/respond?accept=true", headers=mem_headers)
    assert mem_accept.status_code == 200

    # Responding to invite that is no longer pending returns 409
    dup_resp = test_client.post(f"/api/invites/{inv_id}/respond?accept=true", headers=mem_headers)
    assert dup_resp.status_code == 409

    # Leader tries to invite member who is already in an active team (member is in this team or another) -> 409
    # Let's create another team and try to invite member
    other_lead = create_student(db, "otherlead@test.dev", "Other Lead")
    other_lead_h = auth_header(test_client, "otherlead@test.dev", "Student@123")
    c2 = test_client.post(
        "/api/teams",
        headers=other_lead_h,
        json={"hackathon_id": str(hackathon.id), "name": "Team Two", "member_role": "Team Lead"},
    )
    t2_id = c2.json()["id"]
    inv_member_again = test_client.post(f"/api/teams/{t2_id}/invites", headers=other_lead_h, json={"email": "member@test.dev"})
    assert inv_member_again.status_code == 409
    assert "already belongs to an active team" in inv_member_again.json()["detail"].lower()


def test_invite_member_requires_published_or_active_hackathon(client):
    test_client, db = client
    lead = create_student(db, "draftlead@test.dev", "Draft Lead")
    target = create_student(db, "targetstu@test.dev", "Target Stu")
    draft_hackathon = make_hackathon(db, status=HackathonStatus.draft)

    lead_headers = auth_header(test_client, "draftlead@test.dev", "Student@123")

    # Setup a team in draft hackathon via DB
    from app.models.team import Team, TeamMember
    t = Team(
        hackathon_id=draft_hackathon.id,
        name="Draft Squad",
        invite_code="DRAFTSQ1",
        leader_id=lead.id,
        members=[TeamMember(user_id=lead.id, member_role="Lead", status=MemberStatus.active)],
    )
    db.add(t)
    db.commit()

    # invite_member on draft hackathon must return 400
    res = test_client.post(
        f"/api/teams/{t.id}/invites",
        headers=lead_headers,
        json={"email": "targetstu@test.dev"},
    )
    assert res.status_code == 400
    assert "not accepting new members" in res.json()["detail"].lower()


def test_respond_invite_fails_when_caller_already_in_active_team(client):
    test_client, db = client
    lead1 = create_student(db, "lead1@test.dev", "Lead 1")
    lead2 = create_student(db, "lead2@test.dev", "Lead 2")
    student = create_student(db, "swing@test.dev", "Swing Student")
    hackathon = make_hackathon(db)

    h_lead1 = auth_header(test_client, "lead1@test.dev", "Student@123")
    h_lead2 = auth_header(test_client, "lead2@test.dev", "Student@123")
    h_student = auth_header(test_client, "swing@test.dev", "Student@123")

    # Lead 1 creates Team 1
    t1 = test_client.post(
        "/api/teams",
        headers=h_lead1,
        json={"hackathon_id": str(hackathon.id), "name": "Team One", "member_role": "Team Lead"},
    ).json()

    # Lead 2 creates Team 2
    t2 = test_client.post(
        "/api/teams",
        headers=h_lead2,
        json={"hackathon_id": str(hackathon.id), "name": "Team Two", "member_role": "Team Lead"},
    ).json()

    # Lead 2 invites student while student is still free
    inv = test_client.post(
        f"/api/teams/{t2['id']}/invites",
        headers=h_lead2,
        json={"email": "swing@test.dev"},
    ).json()

    # Student joins Team 1 via invite code first
    join1 = test_client.post(
        "/api/teams/join",
        headers=h_student,
        json={"invite_code": t1["invite_code"], "member_role": "Member"},
    )
    assert join1.status_code == 200

    # Student now attempts to accept invite to Team 2 while active in Team 1
    # Must fail with 409 without changing anything
    accept_res = test_client.post(f"/api/invites/{inv['id']}/respond?accept=true", headers=h_student)
    assert accept_res.status_code == 409
    assert "leave your current team" in accept_res.json()["detail"].lower()

    # Verify invite is still pending
    from uuid import UUID
    from app.models.team import TeamInvite
    inv_in_db = db.get(TeamInvite, UUID(inv["id"]))
    assert inv_in_db.status == InviteStatus.pending


def test_respond_invite_non_pending_changes_nothing(client):
    test_client, db = client
    lead = create_student(db, "lead_np@test.dev", "Lead NP")
    target = create_student(db, "target_np@test.dev", "Target NP")
    hackathon = make_hackathon(db)

    h_lead = auth_header(test_client, "lead_np@test.dev", "Student@123")
    h_target = auth_header(test_client, "target_np@test.dev", "Student@123")

    t = test_client.post(
        "/api/teams",
        headers=h_lead,
        json={"hackathon_id": str(hackathon.id), "name": "Team NP", "member_role": "Team Lead"},
    ).json()

    inv = test_client.post(
        f"/api/teams/{t['id']}/invites",
        headers=h_lead,
        json={"email": "target_np@test.dev"},
    ).json()

    # Decline invite -> status becomes declined
    dec = test_client.post(f"/api/invites/{inv['id']}/respond?accept=false", headers=h_target)
    assert dec.status_code == 200

    from uuid import UUID
    from app.models.team import TeamInvite
    inv_row = db.get(TeamInvite, UUID(inv["id"]))
    assert inv_row.status == InviteStatus.declined

    # Try accepting already declined invite -> 409
    try_accept = test_client.post(f"/api/invites/{inv['id']}/respond?accept=true", headers=h_target)
    assert try_accept.status_code == 409

    # Verify status unchanged
    db.refresh(inv_row)
    assert inv_row.status == InviteStatus.declined


def test_cors_expose_headers_effective(client):
    test_client, db = client
    student = create_student(db, "cors_stu@test.dev", "Cors Student")
    h_student = auth_header(test_client, "cors_stu@test.dev", "Student@123")

    # Send request with Origin header as a browser does
    res = test_client.get(
        "/api/students",
        headers={**h_student, "Origin": "http://localhost:5173"},
    )
    assert res.status_code == 200
    assert "X-Total-Count" in res.headers
    # Verify Access-Control-Expose-Headers contains X-Total-Count
    expose_header = res.headers.get("access-control-expose-headers", "")
    assert "X-Total-Count" in expose_header



def test_e2e_module3_walkthrough(client):
    """
    Step 3 Walkthrough with accounts:
    - Seeded leader: aditi@hacknova.dev
    - Seeded member: rahul@hacknova.dev
    - Newly registered invitee: invitee@hacknova.dev
    - Newly registered outsider: outsider@hacknova.dev

    Covers:
    - Create team
    - Invite by email and by id
    - Decline then re-invite
    - Accept
    - Join by code
    - Remove member
    - Transfer leadership
    - Leave
    - Reaching max size
    - Trying to join a second team
    - Outsider opening the team
    - Solo leader leaving deletes the team
    """
    test_client, db = client

    # Seeded accounts
    aditi = create_student(db, "aditi@hacknova.dev", "Aditi Sharma")
    rahul = create_student(db, "rahul@hacknova.dev", "Rahul Mehta")

    # Newly registered accounts
    reg_inv = test_client.post(
        "/api/auth/register",
        json={
            "full_name": "Invitee Student",
            "email": "invitee@hacknova.dev",
            "password": "Student@123",
            "confirm_password": "Student@123",
            "college": "COEP",
            "branch": "IT",
            "year": "TY",
        },
    )
    assert reg_inv.status_code == 201
    invitee_token = reg_inv.json()["access_token"]
    invitee_headers = {"Authorization": f"Bearer {invitee_token}"}
    invitee_me = test_client.get("/api/users/me", headers=invitee_headers).json()
    invitee_id = invitee_me["id"]

    reg_out = test_client.post(
        "/api/auth/register",
        json={
            "full_name": "Outsider Student",
            "email": "outsider@hacknova.dev",
            "password": "Student@123",
            "confirm_password": "Student@123",
            "college": "VIT",
            "branch": "Comp",
            "year": "SY",
        },
    )
    assert reg_out.status_code == 201
    outsider_token = reg_out.json()["access_token"]
    outsider_headers = {"Authorization": f"Bearer {outsider_token}"}

    # Hackathon with max 3 members
    hackathon = make_hackathon(db)
    hackathon.team_size_min = 2
    hackathon.team_size_max = 3
    db.commit()

    aditi_headers = auth_header(test_client, "aditi@hacknova.dev", "Student@123")
    rahul_headers = auth_header(test_client, "rahul@hacknova.dev", "Student@123")

    # 1. CREATE: Aditi creates team "Hyper Nova"
    created = test_client.post(
        "/api/teams",
        headers=aditi_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Hyper Nova", "member_role": "Team Lead"},
    )
    assert created.status_code == 201
    team_data = created.json()
    team_id = team_data["id"]
    invite_code = team_data["invite_code"]
    assert team_data["leader_name"] == "Aditi Sharma"
    assert team_data["active_member_count"] == 1
    assert team_data["is_ready"] is False
    assert team_data["is_full"] is False

    # 2. INVITE BY EMAIL: Aditi invites Rahul by email
    inv_rahul = test_client.post(
        f"/api/teams/{team_id}/invites",
        headers=aditi_headers,
        json={"email": "rahul@hacknova.dev"},
    )
    assert inv_rahul.status_code == 201
    rahul_invite_id = inv_rahul.json()["id"]

    # 3. DECLINE THEN RE-INVITE: Rahul declines
    dec = test_client.post(f"/api/invites/{rahul_invite_id}/respond?accept=false", headers=rahul_headers)
    assert dec.status_code == 200

    # Aditi re-invites Rahul
    re_inv = test_client.post(
        f"/api/teams/{team_id}/invites",
        headers=aditi_headers,
        json={"email": "rahul@hacknova.dev"},
    )
    assert re_inv.status_code == 201
    assert re_inv.json()["status"] == "pending"
    re_invite_id = re_inv.json()["id"]

    # 4. ACCEPT: Rahul accepts the re-invitation
    acc = test_client.post(f"/api/invites/{re_invite_id}/respond?accept=true", headers=rahul_headers)
    assert acc.status_code == 200
    t_after_rahul = acc.json()
    assert t_after_rahul["active_member_count"] == 2
    assert t_after_rahul["is_ready"] is True  # min=2 reached!
    assert t_after_rahul["is_full"] is False

    # 5. INVITE BY ID: Aditi invites newly registered invitee by invitee_id
    inv_by_id = test_client.post(
        f"/api/teams/{team_id}/invites",
        headers=aditi_headers,
        json={"invitee_id": invitee_id},
    )
    assert inv_by_id.status_code == 201
    invitee_invite_id = inv_by_id.json()["id"]

    # Invitee accepts invite -> Team hits max size 3!
    acc_invitee = test_client.post(f"/api/invites/{invitee_invite_id}/respond?accept=true", headers=invitee_headers)
    assert acc_invitee.status_code == 200
    t_full = acc_invitee.json()
    assert t_full["active_member_count"] == 3
    assert t_full["is_full"] is True

    # 6. REACHING MAX SIZE: Aditi tries to invite outsider -> 409 full
    full_inv = test_client.post(
        f"/api/teams/{team_id}/invites",
        headers=aditi_headers,
        json={"email": "outsider@hacknova.dev"},
    )
    assert full_inv.status_code == 409
    assert "maximum size" in full_inv.json()["detail"].lower()

    # 7. TRYING TO JOIN A SECOND TEAM: Rahul tries to join another team via join_team -> 409
    join_2nd = test_client.post(
        "/api/teams/join",
        headers=rahul_headers,
        json={"invite_code": "ANYCODE1", "member_role": "Member"},
    )
    assert join_2nd.status_code == 409
    assert "already belong" in join_2nd.json()["detail"].lower()

    # 8. OUTSIDER OPENING TEAM: Outsider attempts GET /api/teams/{team_id} -> 403 Forbidden
    out_view = test_client.get(f"/api/teams/{team_id}", headers=outsider_headers)
    assert out_view.status_code == 403

    # 9. REMOVE MEMBER: Aditi removes Invitee
    inv_member = next(m for m in t_full["members"] if m["user_id"] == invitee_id)
    rem = test_client.post(f"/api/teams/{team_id}/members/{inv_member['id']}/remove", headers=aditi_headers)
    assert rem.status_code == 200
    assert rem.json()["active_member_count"] == 2
    assert rem.json()["is_full"] is False

    # 10. JOIN BY CODE: Invitee joins back via invite_code
    join_back = test_client.post(
        "/api/teams/join",
        headers=invitee_headers,
        json={"invite_code": invite_code, "member_role": "UI/UX"},
    )
    assert join_back.status_code == 200
    assert join_back.json()["active_member_count"] == 3

    # 11. TRANSFER LEADERSHIP: Aditi transfers leadership to Rahul
    rahul_member = next(m for m in join_back.json()["members"] if m["user_id"] == str(rahul.id))
    xfer = test_client.post(
        f"/api/teams/{team_id}/transfer-leadership",
        headers=aditi_headers,
        json={"member_id": rahul_member["id"]},
    )
    assert xfer.status_code == 200
    t_new_lead = xfer.json()
    assert t_new_lead["leader_id"] == str(rahul.id)
    assert t_new_lead["leader_name"] == "Rahul Mehta"
    # Aditi is now a Member
    aditi_m = next(m for m in t_new_lead["members"] if m["user_id"] == str(aditi.id))
    assert aditi_m["member_role"] == "Member"

    # 12. LEAVE: Rahul (as new leader) removes Invitee, Aditi leaves
    inv_m2 = next(m for m in t_new_lead["members"] if m["user_id"] == invitee_id)
    test_client.post(f"/api/teams/{team_id}/members/{inv_m2['id']}/remove", headers=rahul_headers)

    # Aditi leaves the team
    aditi_leave = test_client.post(f"/api/teams/{team_id}/leave", headers=aditi_headers)
    assert aditi_leave.status_code == 200

    # Rahul is now the sole active member. Rahul leaves -> team is deleted!
    rahul_leave = test_client.post(f"/api/teams/{team_id}/leave", headers=rahul_headers)
    assert rahul_leave.status_code == 200
    assert rahul_leave.json().get("deleted") is True

    # Confirm team is gone: cannot be joined with invite_code
    dead_join = test_client.post(
        "/api/teams/join",
        headers=invitee_headers,
        json={"invite_code": invite_code, "member_role": "Member"},
    )
    assert dead_join.status_code in {400, 404}


