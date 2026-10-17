from app.core.security import hash_password
from app.models.hackathon import Hackathon, HackathonDomain, HackathonProblem, HackathonStatus, JudgingCriterion
from app.models.profile import Profile
from app.models.skill import Skill
from app.models.user import User, UserRole
from datetime import date, timedelta


def create_admin(db):
    user = User(
        email="admin@test.dev",
        password_hash=hash_password("Admin@12345"),
        full_name="Admin",
        role=UserRole.admin,
    )
    user.profile = Profile()
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_student(db, email="stu@test.dev", name="Student One"):
    user = User(
        email=email,
        password_hash=hash_password("Student@123"),
        full_name=name,
        role=UserRole.student,
        college="Test College",
        branch="CSE-AI",
        year="TY",
    )
    user.profile = Profile(bio="Builder")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth_header(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def make_hackathon(db, status=HackathonStatus.published, created_by=None):
    today = date.today()
    h = Hackathon(
        name="Test Hack",
        slug="test-hack",
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
        status=status,
        created_by=created_by,
        domains=[HackathonDomain(domain="Healthcare")],
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
            )
        ],
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return h
