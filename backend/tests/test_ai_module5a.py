from uuid import UUID
import pytest
from app.models.ai import AIFeedback, AIRun
from app.models.hackathon import HackathonProblem
from app.models.profile import Availability, Proficiency, UserSkill
from app.models.skill import Skill
from app.models.team import InviteStatus, MemberStatus, TeamInvite, TeamMember
from app.services.ai.scoring import score_candidate
from app.services.ai.skill_gap import resolve_tech_term, tokenize_technologies
from tests.factories import auth_header, create_admin, create_student, make_hackathon


def _seed_base_skills(db):
    skills_data = [
        ("Python", "Backend"),
        ("FastAPI", "Backend"),
        ("PostgreSQL", "Backend"),
        ("Node.js", "Backend"),
        ("React", "Frontend"),
        ("TypeScript", "Frontend"),
        ("Tailwind CSS", "Frontend"),
        ("Figma", "UI/UX"),
        ("User Research", "UI/UX"),
        ("Machine Learning", "AI/ML"),
        ("NLP", "AI/ML"),
        ("Computer Vision", "AI/ML"),
        ("PyTorch", "AI/ML"),
        ("Data Analysis", "Data"),
        ("Product Strategy", "Product"),
        ("Pitching", "Presentation"),
    ]
    created = {}
    for name, cat in skills_data:
        s = db.query(Skill).filter(Skill.name == name).first()
        if not s:
            s = Skill(name=name, category=cat)
            db.add(s)
            db.flush()
        created[name.lower()] = s
    db.commit()
    return created


# =========================================================================
# Case 1 & 2: Technology matching, seeded strings, alias fallback & protected slashes
# =========================================================================

def test_technology_matching_seeded_strings(client):
    _, db = client
    known_skills = _seed_base_skills(db)

    # 1. "Python, maps, time-series, role-based dashboards"
    s1 = "Python, maps, time-series, role-based dashboards"
    toks1 = tokenize_technologies(s1)
    assert toks1 == ["Python", "maps", "time-series", "role-based dashboards"]
    res1 = [resolve_tech_term(t, known_skills) for t in toks1]
    assert res1[0]["type"] == "skill" and res1[0]["name"] == "Python"
    assert res1[1]["type"] == "category" and res1[1]["category"] == "Frontend"  # maps -> Frontend
    assert res1[2]["type"] == "category" and res1[2]["category"] == "Data"  # time-series -> Data
    assert res1[3]["type"] == "category" and res1[3]["category"] == "Frontend"  # dashboards -> Frontend

    # 2. "React, classification, explainable rules"
    s2 = "React, classification, explainable rules"
    toks2 = tokenize_technologies(s2)
    assert toks2 == ["React", "classification", "explainable rules"]
    res2 = [resolve_tech_term(t, known_skills) for t in toks2]
    assert res2[0]["type"] == "skill" and res2[0]["name"] == "React"
    assert res2[1]["type"] == "category" and res2[1]["category"] == "AI/ML"  # classification -> AI/ML
    assert res2[2]["type"] == "unclassified"

    # 3. "React, reminders, structured questionnaires"
    s3 = "React, reminders, structured questionnaires"
    toks3 = tokenize_technologies(s3)
    assert toks3 == ["React", "reminders", "structured questionnaires"]
    res3 = [resolve_tech_term(t, known_skills) for t in toks3]
    assert res3[0]["type"] == "skill" and res3[0]["name"] == "React"
    assert res3[1]["type"] == "unclassified"
    assert res3[2]["type"] == "unclassified"


def test_technology_alias_fallback_if_skill_not_in_db(client):
    _, db = client
    known_skills = _seed_base_skills(db)

    # Docker is in TECH_ALIAS_MAP but NOT in our skills table
    res_docker = resolve_tech_term("docker", known_skills)
    assert res_docker["type"] == "unclassified"

    # reactjs is in TECH_ALIAS_MAP and target React IS in our skills table
    res_reactjs = resolve_tech_term("reactjs", known_skills)
    assert res_reactjs["type"] == "skill" and res_reactjs["name"] == "React"


def test_protected_slash_terms(client):
    _, db = client
    known_skills = _seed_base_skills(db)

    text = "AI/ML; UI/UX; CI/CD; Python"
    toks = tokenize_technologies(text)
    assert "AI/ML" in toks or "ai/ml" in [t.lower() for t in toks]
    assert "UI/UX" in toks or "ui/ux" in [t.lower() for t in toks]
    assert "CI/CD" in toks or "ci/cd" in [t.lower() for t in toks]
    assert "Python" in toks


# =========================================================================
# Case 3: Availability logic: team_mode and weekdays vs weekends
# =========================================================================

def test_availability_compatibility_weekdays_vs_weekends(client):
    _, db = client
    _seed_base_skills(db)

    # Candidate with weekdays
    u_weekdays = create_student(db, "wd@test.dev", "WD Student")
    u_weekdays.profile.availability = Availability.weekdays
    db.commit()

    # Candidate with weekends
    u_weekends = create_student(db, "we@test.dev", "WE Student")
    u_weekends.profile.availability = Availability.weekends
    db.commit()

    # Candidate with flexible
    u_flex = create_student(db, "flex@test.dev", "Flex Student")
    u_flex.profile.availability = Availability.flexible
    db.commit()

    # Candidate with limited
    u_lim = create_student(db, "lim@test.dev", "Lim Student")
    u_lim.profile.availability = Availability.limited
    db.commit()

    # Team mode: weekdays
    res_wd = score_candidate(u_weekdays, ["Backend"], set(), "weekdays")
    assert res_wd["features"]["availability"] == 1.0

    res_we_on_wd = score_candidate(u_weekends, ["Backend"], set(), "weekdays")
    assert res_we_on_wd["features"]["availability"] == 0.0

    res_flex = score_candidate(u_flex, ["Backend"], set(), "weekdays")
    assert res_flex["features"]["availability"] == 1.0

    res_lim = score_candidate(u_lim, ["Backend"], set(), "weekdays")
    assert res_lim["features"]["availability"] == 0.3


# =========================================================================
# Case 4: Deterministic ordering & filler candidate outranks non-filler
# =========================================================================

def test_filler_candidate_outranks_non_filler(client):
    test_client, db = client
    skills = _seed_base_skills(db)
    hackathon = make_hackathon(db)

    # Leader has Frontend skills
    leader = create_student(db, "lead@test.dev", "Leader Student")
    db.add(UserSkill(user_id=leader.id, skill_id=skills["react"].id, proficiency=Proficiency.advanced))
    db.commit()

    lead_headers = auth_header(test_client, "lead@test.dev", "Student@123")
    create_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad A", "member_role": "Lead"},
    )
    team_id = create_res.json()["id"]

    # Candidate 1: Backend filler (team missing Backend)
    cand_filler = create_student(db, "filler@test.dev", "Filler Student")
    db.add(UserSkill(user_id=cand_filler.id, skill_id=skills["python"].id, proficiency=Proficiency.advanced))
    db.add(UserSkill(user_id=cand_filler.id, skill_id=skills["fastapi"].id, proficiency=Proficiency.advanced))
    db.commit()

    # Candidate 2: Frontend non-filler (team already strong in Frontend)
    cand_non_filler = create_student(db, "nonfiller@test.dev", "NonFiller Student")
    db.add(UserSkill(user_id=cand_non_filler.id, skill_id=skills["react"].id, proficiency=Proficiency.beginner))
    db.commit()

    rec_res = test_client.get(f"/api/ai/teams/{team_id}/recommendations", headers=lead_headers)
    assert rec_res.status_code == 200
    data = rec_res.json()
    recs = data["recommendations"]
    assert len(recs) >= 2
    # Filler student must outrank non-filler
    filler_rec = next(r for r in recs if r["id"] == str(cand_filler.id))
    nf_rec = next(r for r in recs if r["id"] == str(cand_non_filler.id))
    assert filler_rec["score"] > nf_rec["score"]


def test_deterministic_ordering(client):
    test_client, db = client
    skills = _seed_base_skills(db)
    hackathon = make_hackathon(db)

    leader = create_student(db, "lead2@test.dev", "Leader 2")
    lead_headers = auth_header(test_client, "lead2@test.dev", "Student@123")
    team_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad Det", "member_role": "Lead"},
    )
    team_id = team_res.json()["id"]

    # Create 3 candidates with identical skills & profile
    for i, name in enumerate(["Charlie", "Alice", "Bob"]):
        s = create_student(db, f"cand_{i}@test.dev", name)
        db.add(UserSkill(user_id=s.id, skill_id=skills["python"].id, proficiency=Proficiency.intermediate))
    db.commit()

    rec_res = test_client.get(f"/api/ai/teams/{team_id}/recommendations", headers=lead_headers)
    recs = rec_res.json()["recommendations"]
    names = [r["full_name"] for r in recs if r["full_name"] in {"Alice", "Bob", "Charlie"}]
    # Alphabetical tie-break when scores are equal
    assert names == ["Alice", "Bob", "Charlie"]


# =========================================================================
# Case 5 & 6: Exclusions (current/former members, other teams, zero skills) & pending invite
# =========================================================================

def test_users_on_other_teams_and_current_members_excluded(client):
    test_client, db = client
    skills = _seed_base_skills(db)
    hackathon = make_hackathon(db)

    leader = create_student(db, "lead3@test.dev", "Lead 3")
    lead_headers = auth_header(test_client, "lead3@test.dev", "Student@123")
    t1_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad 1", "member_role": "Lead"},
    )
    team1_id = UUID(t1_res.json()["id"])

    # Student on Squad 2
    lead_other = create_student(db, "other_lead@test.dev", "Other Lead")
    other_headers = auth_header(test_client, "other_lead@test.dev", "Student@123")
    t2_res = test_client.post(
        "/api/teams",
        headers=other_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad 2", "member_role": "Lead"},
    )
    team2_id = UUID(t2_res.json()["id"])

    student_on_t2 = create_student(db, "on_t2@test.dev", "On T2")
    db.add(UserSkill(user_id=student_on_t2.id, skill_id=skills["python"].id, proficiency=Proficiency.advanced))
    db.add(TeamMember(team_id=team2_id, user_id=student_on_t2.id, member_role="Dev", status=MemberStatus.active))
    db.commit()

    # Former member of Squad 1
    former = create_student(db, "former@test.dev", "Former Member")
    db.add(UserSkill(user_id=former.id, skill_id=skills["python"].id, proficiency=Proficiency.advanced))
    db.add(TeamMember(team_id=team1_id, user_id=former.id, member_role="Dev", status=MemberStatus.left))
    db.commit()

    rec_res = test_client.get(f"/api/ai/teams/{team1_id}/recommendations", headers=lead_headers)
    rec_ids = [r["id"] for r in rec_res.json()["recommendations"]]
    assert str(student_on_t2.id) not in rec_ids
    assert str(former.id) not in rec_ids
    assert str(leader.id) not in rec_ids


def test_pending_invite_candidate_marked(client):
    test_client, db = client
    skills = _seed_base_skills(db)
    hackathon = make_hackathon(db)

    leader = create_student(db, "lead_inv@test.dev", "Lead Inv")
    lead_headers = auth_header(test_client, "lead_inv@test.dev", "Student@123")
    t_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad Inv", "member_role": "Lead"},
    )
    team_id = t_res.json()["id"]

    invited = create_student(db, "invited@test.dev", "Invited Student")
    db.add(UserSkill(user_id=invited.id, skill_id=skills["python"].id, proficiency=Proficiency.advanced))
    db.add(TeamInvite(team_id=UUID(team_id), inviter_id=leader.id, invitee_id=invited.id, status=InviteStatus.pending))
    db.commit()

    rec_res = test_client.get(f"/api/ai/teams/{team_id}/recommendations", headers=lead_headers)
    rec = next(r for r in rec_res.json()["recommendations"] if r["id"] == str(invited.id))
    assert rec["invite_pending"] is True


def test_zero_skills_excluded_and_incomplete_counted(client):
    test_client, db = client
    hackathon = make_hackathon(db)

    leader = create_student(db, "lead_zero@test.dev", "Lead Zero")
    lead_headers = auth_header(test_client, "lead_zero@test.dev", "Student@123")
    t_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad Zero", "member_role": "Lead"},
    )
    team_id = t_res.json()["id"]

    # Student with profile but 0 skills
    noskill = create_student(db, "noskill@test.dev", "No Skill")

    rec_res = test_client.get(f"/api/ai/teams/{team_id}/recommendations", headers=lead_headers)
    data = rec_res.json()
    assert data["excluded_incomplete_count"] >= 1
    assert str(noskill.id) not in [r["id"] for r in data["recommendations"]]


# =========================================================================
# Case 7: Privacy: No email anywhere in recommendations, skill-gap, or ai_runs JSON
# =========================================================================

def test_no_email_anywhere(client):
    test_client, db = client
    skills = _seed_base_skills(db)
    hackathon = make_hackathon(db)

    leader = create_student(db, "lead_priv@test.dev", "Lead Privacy")
    lead_headers = auth_header(test_client, "lead_priv@test.dev", "Student@123")
    t_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad Privacy", "member_role": "Lead"},
    )
    team_id = t_res.json()["id"]

    cand = create_student(db, "cand_secret_email@test.dev", "Secret Email")
    db.add(UserSkill(user_id=cand.id, skill_id=skills["python"].id, proficiency=Proficiency.advanced))
    db.commit()

    rec_res = test_client.get(f"/api/ai/teams/{team_id}/recommendations", headers=lead_headers)
    assert rec_res.status_code == 200
    rec_text = rec_res.text
    assert "secret_email" not in rec_text
    assert "@test.dev" not in rec_text

    # Check ai_runs table row
    run = db.query(AIRun).filter(AIRun.team_id == UUID(team_id)).first()
    assert run is not None
    import json
    in_str = json.dumps(run.input_json)
    out_str = json.dumps(run.output_json)
    assert "@" not in in_str
    assert "@" not in out_str
    assert "secret_email" not in in_str
    assert "secret_email" not in out_str


# =========================================================================
# Case 8: Skill-gap cases & validation
# =========================================================================

def test_skill_gap_analysis_cases(client):
    test_client, db = client
    skills = _seed_base_skills(db)
    hackathon = make_hackathon(db)

    leader = create_student(db, "lead_sg@test.dev", "Lead SG")
    lead_headers = auth_header(test_client, "lead_sg@test.dev", "Student@123")
    t_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad SG", "member_role": "Lead"},
    )
    team_id = t_res.json()["id"]

    # 1. No problem selected -> 400
    sg_res_no_prob = test_client.get(f"/api/ai/teams/{team_id}/skill-gap", headers=lead_headers)
    assert sg_res_no_prob.status_code == 400
    assert "Team has not selected a problem statement" in sg_res_no_prob.json()["detail"]

    # 2. Add problem and select it
    problem = HackathonProblem(
        hackathon_id=hackathon.id,
        code="PROB-1",
        title="Predictive Health",
        statement="Build a predictive health system",
        description="Health prediction system",
        domain="Healthcare",
        target_users="Clinicians and patients",
        constraints="GDPR compliance",
        expected_outcome="Working prototype",
        evaluation_criteria="Accuracy and UX",
        required_technologies="Python, maps, time-series, role-based dashboards",
        is_published=True,
    )
    db.add(problem)
    db.flush()

    sel_res = test_client.post(
        f"/api/teams/{team_id}/problem",
        headers=lead_headers,
        json={"problem_id": str(problem.id)},
    )
    assert sel_res.status_code == 200

    # Squad has no skills initially
    sg_res1 = test_client.get(f"/api/ai/teams/{team_id}/skill-gap", headers=lead_headers)
    assert sg_res1.status_code == 200
    d1 = sg_res1.json()
    assert d1["summary"]["total_required"] == 4
    # All are missing initially
    assert d1["summary"]["missing"] == 4

    # Leader adds Python (advanced)
    db.add(UserSkill(user_id=leader.id, skill_id=skills["python"].id, proficiency=Proficiency.advanced))
    db.commit()

    sg_res2 = test_client.get(f"/api/ai/teams/{team_id}/skill-gap", headers=lead_headers)
    d2 = sg_res2.json()
    assert d2["summary"]["covered"] >= 1
    covered_names = [it["name"] for it in d2["covered"] if it.get("name")]
    assert "Python" in covered_names


# =========================================================================
# Case 9: Permissions: leader/member vs outsider
# =========================================================================

def test_recommendations_and_skill_gap_permissions(client):
    test_client, db = client
    hackathon = make_hackathon(db)

    leader = create_student(db, "lead_perm@test.dev", "Lead Perm")
    member = create_student(db, "mem_perm@test.dev", "Mem Perm")
    outsider = create_student(db, "out_perm@test.dev", "Outsider Perm")

    lead_headers = auth_header(test_client, "lead_perm@test.dev", "Student@123")
    mem_headers = auth_header(test_client, "mem_perm@test.dev", "Student@123")
    out_headers = auth_header(test_client, "out_perm@test.dev", "Student@123")

    t_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad Perm", "member_role": "Lead"},
    )
    team_id = t_res.json()["id"]

    db.add(TeamMember(team_id=UUID(team_id), user_id=member.id, member_role="Dev", status=MemberStatus.active))
    db.commit()

    # Leader -> 200
    assert test_client.get(f"/api/ai/teams/{team_id}/recommendations", headers=lead_headers).status_code == 200
    # Member -> 200
    assert test_client.get(f"/api/ai/teams/{team_id}/recommendations", headers=mem_headers).status_code == 200
    # Outsider -> 403
    assert test_client.get(f"/api/ai/teams/{team_id}/recommendations", headers=out_headers).status_code == 403


# =========================================================================
# Case 10: Limit & min_score validation
# =========================================================================

def test_limit_and_min_score_validation(client):
    test_client, db = client
    hackathon = make_hackathon(db)
    leader = create_student(db, "lead_val@test.dev", "Lead Val")
    lead_headers = auth_header(test_client, "lead_val@test.dev", "Student@123")

    t_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad Val", "member_role": "Lead"},
    )
    team_id = t_res.json()["id"]

    # limit invalid
    assert test_client.get(f"/api/ai/teams/{team_id}/recommendations?limit=0", headers=lead_headers).status_code == 422
    assert test_client.get(f"/api/ai/teams/{team_id}/recommendations?limit=25", headers=lead_headers).status_code == 422
    assert test_client.get(f"/api/ai/teams/{team_id}/recommendations?limit=5", headers=lead_headers).status_code == 200

    # min_score invalid
    assert test_client.get(f"/api/ai/teams/{team_id}/recommendations?min_score=-1", headers=lead_headers).status_code == 422
    assert test_client.get(f"/api/ai/teams/{team_id}/recommendations?min_score=101", headers=lead_headers).status_code == 422
    assert test_client.get(f"/api/ai/teams/{team_id}/recommendations?min_score=50", headers=lead_headers).status_code == 200


# =========================================================================
# Case 11: Feedback validation, code-level upsert, and own-team-only
# =========================================================================

def test_feedback_validation_and_upsert_and_own_team_only(client):
    test_client, db = client
    skills = _seed_base_skills(db)
    hackathon = make_hackathon(db)

    leader = create_student(db, "lead_fb@test.dev", "Lead FB")
    outsider = create_student(db, "out_fb@test.dev", "Outsider FB")
    lead_headers = auth_header(test_client, "lead_fb@test.dev", "Student@123")
    out_headers = auth_header(test_client, "out_fb@test.dev", "Student@123")

    t_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad FB", "member_role": "Lead"},
    )
    team_id = t_res.json()["id"]

    cand = create_student(db, "cand_fb@test.dev", "Cand FB")
    db.add(UserSkill(user_id=cand.id, skill_id=skills["python"].id, proficiency=Proficiency.advanced))
    db.commit()

    rec_res = test_client.get(f"/api/ai/teams/{team_id}/recommendations", headers=lead_headers)
    run_id = rec_res.json()["run_id"]
    cand_id = rec_res.json()["recommendations"][0]["id"]

    # 1. Invalid rating -> 422
    bad_rating = test_client.post(
        "/api/ai/feedback",
        headers=lead_headers,
        json={"run_id": run_id, "candidate_id": cand_id, "rating": 5},
    )
    assert bad_rating.status_code == 422

    # 2. Invalid candidate_id -> 400
    import uuid
    bad_cand = test_client.post(
        "/api/ai/feedback",
        headers=lead_headers,
        json={"run_id": run_id, "candidate_id": str(uuid.uuid4()), "rating": 1},
    )
    assert bad_cand.status_code == 400

    # 3. Outsider cannot submit feedback -> 403
    out_fb = test_client.post(
        "/api/ai/feedback",
        headers=out_headers,
        json={"run_id": run_id, "candidate_id": cand_id, "rating": 1},
    )
    assert out_fb.status_code == 403

    # 4. Valid feedback with candidate_id
    fb1 = test_client.post(
        "/api/ai/feedback",
        headers=lead_headers,
        json={"run_id": run_id, "candidate_id": cand_id, "rating": 1, "comment": "Great match!"},
    )
    assert fb1.status_code == 201
    assert fb1.json()["rating"] == 1

    # 5. Upsert with candidate_id
    fb1_up = test_client.post(
        "/api/ai/feedback",
        headers=lead_headers,
        json={"run_id": run_id, "candidate_id": cand_id, "rating": -1, "comment": "Changed my mind"},
    )
    assert fb1_up.status_code == 201
    assert fb1_up.json()["id"] == fb1.json()["id"]
    assert fb1_up.json()["rating"] == -1

    # 6. Two feedback posts without candidate_id on the same run -> upserts cleanly
    fb_no_cand1 = test_client.post(
        "/api/ai/feedback",
        headers=lead_headers,
        json={"run_id": run_id, "rating": 1, "comment": "Run overall good"},
    )
    assert fb_no_cand1.status_code == 201

    fb_no_cand2 = test_client.post(
        "/api/ai/feedback",
        headers=lead_headers,
        json={"run_id": run_id, "rating": -1, "comment": "Run overall updated"},
    )
    assert fb_no_cand2.status_code == 201
    assert fb_no_cand2.json()["id"] == fb_no_cand1.json()["id"]


# =========================================================================
# Case 12: Feedback summary endpoint (admin only)
# =========================================================================

def test_feedback_summary_admin_only_and_calculations(client):
    test_client, db = client
    skills = _seed_base_skills(db)
    hackathon = make_hackathon(db)
    admin = create_admin(db)
    admin_headers = auth_header(test_client, "admin@test.dev", "Admin@12345")

    leader = create_student(db, "lead_sum@test.dev", "Lead Sum")
    lead_headers = auth_header(test_client, "lead_sum@test.dev", "Student@123")

    # Non-admin forbidden
    assert test_client.get("/api/ai/feedback/summary", headers=lead_headers).status_code == 403

    # Zero-feedback guard
    sum_zero = test_client.get("/api/ai/feedback/summary", headers=admin_headers)
    assert sum_zero.status_code == 200
    assert sum_zero.json()["satisfaction_rate"] == 0.0

    # Create team & run
    t_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad Sum", "member_role": "Lead"},
    )
    team_id = t_res.json()["id"]

    cand = create_student(db, "cand_sum@test.dev", "Cand Sum")
    db.add(UserSkill(user_id=cand.id, skill_id=skills["python"].id, proficiency=Proficiency.advanced))
    db.commit()

    rec_res = test_client.get(f"/api/ai/teams/{team_id}/recommendations", headers=lead_headers)
    run_id = rec_res.json()["run_id"]
    cand_id = rec_res.json()["recommendations"][0]["id"]

    test_client.post(
        "/api/ai/feedback",
        headers=lead_headers,
        json={"run_id": run_id, "candidate_id": cand_id, "rating": 1, "comment": "Nice!"},
    )

    sum_res = test_client.get("/api/ai/feedback/summary", headers=admin_headers)
    assert sum_res.status_code == 200
    d = sum_res.json()
    assert d["total_feedback"] >= 1
    assert d["positive_count"] >= 1
    assert d["satisfaction_rate"] == 100.0
    assert len(d["recent_comments"]) >= 1


# =========================================================================
# Case 13: Team deletion cascades cleanly (ai_runs.team_id set to null)
# =========================================================================

def test_team_deletion_works(client):
    test_client, db = client
    hackathon = make_hackathon(db)
    leader = create_student(db, "lead_del@test.dev", "Lead Del")
    lead_headers = auth_header(test_client, "lead_del@test.dev", "Student@123")

    t_res = test_client.post(
        "/api/teams",
        headers=lead_headers,
        json={"hackathon_id": str(hackathon.id), "name": "Squad Del", "member_role": "Lead"},
    )
    team_id = t_res.json()["id"]

    rec_res = test_client.get(f"/api/ai/teams/{team_id}/recommendations", headers=lead_headers)
    run_id = rec_res.json()["run_id"]

    # Leader leaves as sole member -> deletes team
    leave_res = test_client.post(f"/api/teams/{team_id}/leave", headers=lead_headers)
    assert leave_res.status_code == 200

    # Team is deleted, ai_run still exists with team_id=None
    run = db.query(AIRun).filter(AIRun.id == UUID(run_id)).first()
    assert run is not None
    assert run.team_id is None
