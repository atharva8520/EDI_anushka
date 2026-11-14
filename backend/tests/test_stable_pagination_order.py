import uuid
from datetime import date, datetime, timedelta, timezone

from app.core.security import hash_password
from app.models.hackathon import Hackathon, HackathonStatus
from app.models.profile import Profile
from app.models.project import ActivityLog, Project, ProjectNote
from app.models.team import MemberStatus, Team, TeamMember
from app.models.user import User, UserRole
from tests.factories import auth_header, create_admin, create_student


def test_admin_teams_stable_pagination_order(client):
    test_client, db = client
    create_admin(db)
    adm_headers = auth_header(test_client, "admin@test.dev", "Admin@12345")

    today = date.today()
    h = Hackathon(
        name="Pagination Hackathon",
        slug="pagination-hack",
        description="Testing stable pagination order on teams with identical created_at.",
        short_description="Short desc.",
        organizer="Org",
        start_date=today + timedelta(days=10),
        end_date=today + timedelta(days=12),
        registration_deadline=today + timedelta(days=8),
        location="Pune",
        rules="Rules",
        status=HackathonStatus.published,
    )
    db.add(h)
    db.flush()

    fixed_now = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    teams = []
    # Create 5 teams with explicit IDENTICAL created_at values in one transaction
    for i in range(5):
        leader = create_student(db, f"lead_stab_{i}@test.dev", f"Leader {i}")
        t = Team(
            id=uuid.uuid4(),
            hackathon_id=h.id,
            name=f"Stable Squad {i}",
            leader_id=leader.id,
            invite_code=f"STAB{i:02d}",
            created_at=fixed_now,
        )
        db.add(t)
        db.flush()
        db.add(TeamMember(team_id=t.id, user_id=leader.id, member_role="Lead", status=MemberStatus.active))
        teams.append(t)
    db.commit()

    # Collect all teams across pages with limit=2
    collected_ids = []
    limit = 2
    for skip in range(0, 5, limit):
        res = test_client.get(
            f"/api/admin/teams?hackathon_id={h.id}&limit={limit}&skip={skip}",
            headers=adm_headers,
        )
        assert res.status_code == 200
        page_ids = [item["id"] for item in res.json()]
        collected_ids.extend(page_ids)

    # Every row must be returned exactly once across pages
    assert len(collected_ids) == 5
    assert len(set(collected_ids)) == 5

    # Order must match the deterministic tie-breaker (created_at DESC, id DESC)
    expected_ids = [
        str(t.id) for t in sorted(teams, key=lambda t: (t.created_at, t.id), reverse=True)
    ]
    assert collected_ids == expected_ids

    # Two repeated requests for page 1 must return the exact same order
    res_repeat1 = test_client.get(f"/api/admin/teams?hackathon_id={h.id}&limit=2&skip=0", headers=adm_headers)
    res_repeat2 = test_client.get(f"/api/admin/teams?hackathon_id={h.id}&limit=2&skip=0", headers=adm_headers)
    assert [item["id"] for item in res_repeat1.json()] == [item["id"] for item in res_repeat2.json()]


def test_admin_participants_stable_pagination_order(client):
    test_client, db = client
    create_admin(db)
    adm_headers = auth_header(test_client, "admin@test.dev", "Admin@12345")

    fixed_now = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    students = []
    for i in range(5):
        u = User(
            id=uuid.uuid4(),
            email=f"part_stab_{i}@test.dev",
            password_hash=hash_password("Student@123"),
            full_name=f"Participant {i}",
            role=UserRole.student,
            created_at=fixed_now,
        )
        u.profile = Profile(bio="Bio")
        db.add(u)
        students.append(u)
    db.commit()

    # Query with college filter to isolate our 5 test students
    collected_ids = []
    limit = 2
    for skip in range(0, 5, limit):
        res = test_client.get(
            f"/api/admin/participants?q=part_stab&limit={limit}&skip={skip}",
            headers=adm_headers,
        )
        assert res.status_code == 200
        page_ids = [item["id"] for item in res.json()]
        collected_ids.extend(page_ids)

    assert len(collected_ids) == 5
    assert len(set(collected_ids)) == 5

    expected_ids = [
        str(u.id) for u in sorted(students, key=lambda u: (u.created_at, u.id), reverse=True)
    ]
    assert collected_ids == expected_ids

    # Repeated request check
    r1 = test_client.get(f"/api/admin/participants?q=part_stab&limit=2&skip=0", headers=adm_headers)
    r2 = test_client.get(f"/api/admin/participants?q=part_stab&limit=2&skip=0", headers=adm_headers)
    assert [item["id"] for item in r1.json()] == [item["id"] for item in r2.json()]


def test_hackathons_stable_pagination_order(client):
    test_client, db = client
    create_admin(db)
    adm_headers = auth_header(test_client, "admin@test.dev", "Admin@12345")

    fixed_date = date(2027, 1, 10)
    fixed_now = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    hackathons = []
    for i in range(5):
        h = Hackathon(
            id=uuid.uuid4(),
            name=f"Stable Hackathon {i}",
            slug=f"stable-hack-{i}",
            description="Testing stable pagination order on hackathons with identical start_date.",
            short_description="Short desc.",
            organizer="Org",
            start_date=fixed_date,
            end_date=fixed_date + timedelta(days=2),
            registration_deadline=fixed_date - timedelta(days=2),
            location="Pune",
            rules="Rules",
            status=HackathonStatus.published,
            created_at=fixed_now,
        )
        db.add(h)
        hackathons.append(h)
    db.commit()

    # 1. Test order=desc
    collected_ids_desc = []
    limit = 2
    for skip in range(0, 5, limit):
        res = test_client.get(
            f"/api/hackathons?q=Stable Hackathon&sort_by=start_date&order=desc&limit={limit}&skip={skip}",
            headers=adm_headers,
        )
        assert res.status_code == 200
        page_ids = [item["id"] for item in res.json()]
        collected_ids_desc.extend(page_ids)

    assert len(collected_ids_desc) == 5
    assert len(set(collected_ids_desc)) == 5

    expected_ids_desc = [
        str(h.id) for h in sorted(hackathons, key=lambda h: (h.start_date, h.id), reverse=True)
    ]
    assert collected_ids_desc == expected_ids_desc

    # 2. Test order=asc
    collected_ids_asc = []
    for skip in range(0, 5, limit):
        res = test_client.get(
            f"/api/hackathons?q=Stable Hackathon&sort_by=start_date&order=asc&limit={limit}&skip={skip}",
            headers=adm_headers,
        )
        assert res.status_code == 200
        page_ids = [item["id"] for item in res.json()]
        collected_ids_asc.extend(page_ids)

    assert len(collected_ids_asc) == 5
    assert len(set(collected_ids_asc)) == 5

    expected_ids_asc = [
        str(h.id) for h in sorted(hackathons, key=lambda h: (h.start_date, h.id), reverse=False)
    ]
    assert collected_ids_asc == expected_ids_asc


def test_project_notes_stable_pagination_order(client):
    test_client, db = client
    leader = create_student(db, "lead_note@test.dev", "Note Lead")
    token_headers = auth_header(test_client, "lead_note@test.dev", "Student@123")

    today = date.today()
    h = Hackathon(
        name="Note Hackathon",
        slug="note-hack",
        description="Hackathon for testing notes pagination.",
        short_description="Short desc.",
        organizer="Org",
        start_date=today + timedelta(days=5),
        end_date=today + timedelta(days=7),
        registration_deadline=today + timedelta(days=3),
        location="Virtual",
        rules="Rules",
        status=HackathonStatus.active,
    )
    db.add(h)
    db.flush()

    t = Team(
        hackathon_id=h.id,
        name="Note Team",
        leader_id=leader.id,
        invite_code="NOTE01",
    )
    db.add(t)
    db.flush()
    db.add(TeamMember(team_id=t.id, user_id=leader.id, member_role="Lead", status=MemberStatus.active))

    proj = Project(team_id=t.id, title="Note Project", created_by=leader.id)
    db.add(proj)
    db.flush()

    fixed_now = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    notes = []
    for i in range(5):
        n = ProjectNote(
            id=uuid.uuid4(),
            project_id=proj.id,
            title=f"Note {i}",
            body=f"Body of note {i} with sufficient text.",
            created_by=leader.id,
            created_at=fixed_now,
        )
        db.add(n)
        notes.append(n)
    db.commit()

    collected_ids = []
    limit = 2
    for skip in range(0, 5, limit):
        res = test_client.get(
            f"/api/projects/{proj.id}/notes?limit={limit}&skip={skip}",
            headers=token_headers,
        )
        assert res.status_code == 200
        page_ids = [item["id"] for item in res.json()]
        collected_ids.extend(page_ids)

    assert len(collected_ids) == 5
    assert len(set(collected_ids)) == 5

    expected_ids = [
        str(n.id) for n in sorted(notes, key=lambda n: (n.created_at, n.id), reverse=True)
    ]
    assert collected_ids == expected_ids


def test_project_activity_stable_pagination_order(client):
    test_client, db = client
    leader = create_student(db, "lead_act@test.dev", "Activity Lead")
    token_headers = auth_header(test_client, "lead_act@test.dev", "Student@123")

    today = date.today()
    h = Hackathon(
        name="Activity Hackathon",
        slug="activity-hack",
        description="Hackathon for testing activity pagination.",
        short_description="Short desc.",
        organizer="Org",
        start_date=today + timedelta(days=5),
        end_date=today + timedelta(days=7),
        registration_deadline=today + timedelta(days=3),
        location="Virtual",
        rules="Rules",
        status=HackathonStatus.active,
    )
    db.add(h)
    db.flush()

    t = Team(
        hackathon_id=h.id,
        name="Activity Team",
        leader_id=leader.id,
        invite_code="ACT01",
    )
    db.add(t)
    db.flush()
    db.add(TeamMember(team_id=t.id, user_id=leader.id, member_role="Lead", status=MemberStatus.active))

    proj = Project(team_id=t.id, title="Activity Project", created_by=leader.id)
    db.add(proj)
    db.flush()

    fixed_now = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    activities = []
    for i in range(5):
        act = ActivityLog(
            id=uuid.uuid4(),
            project_id=proj.id,
            actor_id=leader.id,
            action="task_created",
            entity_type="task",
            entity_id=uuid.uuid4(),
            details={"task_title": f"Task {i}"},
            created_at=fixed_now,
        )
        db.add(act)
        activities.append(act)
    db.commit()

    collected_ids = []
    limit = 2
    for skip in range(0, 5, limit):
        res = test_client.get(
            f"/api/projects/{proj.id}/activity?limit={limit}&skip={skip}",
            headers=token_headers,
        )
        assert res.status_code == 200
        page_ids = [item["id"] for item in res.json()]
        collected_ids.extend(page_ids)

    assert len(collected_ids) == 5
    assert len(set(collected_ids)) == 5

    expected_ids = [
        str(a.id) for a in sorted(activities, key=lambda a: (a.created_at, a.id), reverse=True)
    ]
    assert collected_ids == expected_ids


def test_students_search_stable_pagination_order(client):
    test_client, db = client
    caller = create_student(db, "caller@test.dev", "Caller Student")
    token_headers = auth_header(test_client, "caller@test.dev", "Student@123")

    students = []
    for i in range(5):
        u = User(
            id=uuid.uuid4(),
            email=f"same_name_{i}@test.dev",
            password_hash=hash_password("Student@123"),
            full_name="Identical Name Student",
            role=UserRole.student,
        )
        u.profile = Profile(bio="Bio")
        db.add(u)
        students.append(u)
    db.commit()

    collected_ids = []
    limit = 2
    for skip in range(0, 5, limit):
        res = test_client.get(
            f"/api/students?q=Identical Name Student&limit={limit}&skip={skip}",
            headers=token_headers,
        )
        assert res.status_code == 200
        page_ids = [item["id"] for item in res.json()]
        collected_ids.extend(page_ids)

    assert len(collected_ids) == 5
    assert len(set(collected_ids)) == 5

    expected_ids = [
        str(u.id) for u in sorted(students, key=lambda u: (u.full_name, u.id), reverse=False)
    ]
    assert collected_ids == expected_ids
