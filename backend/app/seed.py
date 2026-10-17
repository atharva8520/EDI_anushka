from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.hackathon import Hackathon, HackathonDomain, HackathonProblem, HackathonStatus, JudgingCriterion
from app.models.profile import (
    Availability,
    PreviousProject,
    Proficiency,
    Profile,
    UserDomainInterest,
    UserPreferredRole,
    UserSkill,
)
from app.models.skill import Skill
from app.models.team import MemberStatus, Team, TeamMember, TeamProblemSelection
from app.models.user import User, UserRole
from app.services.ids import generate_invite_code, unique_slug

SKILLS = [
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

STUDENTS = [
    {
        "email": "aditi@hacknova.dev",
        "full_name": "Aditi Sharma",
        "college": "Pune Institute of Computer Technology",
        "branch": "CSE-AI",
        "year": "TY",
        "bio": "Backend engineer who enjoys turning messy operational problems into reliable APIs.",
        "roles": ["Backend", "AI/ML"],
        "domains": ["Healthcare", "Civic Tech"],
        "skills": [("Python", "advanced"), ("FastAPI", "advanced"), ("PostgreSQL", "advanced"), ("Machine Learning", "intermediate")],
        "availability": Availability.flexible,
        "github": "https://github.com/aditi-demo",
        "experience": "3 campus hackathons",
        "projects": [("Campus Med Queue", "Reduced OPD wait-time estimates using historical footfall.", "Python, FastAPI", 2025)],
    },
    {
        "email": "rahul@hacknova.dev",
        "full_name": "Rahul Mehta",
        "college": "VIT Pune",
        "branch": "CSE",
        "year": "TY",
        "bio": "Frontend specialist focused on dense product dashboards that still feel calm.",
        "roles": ["Frontend", "UI/UX"],
        "domains": ["FinTech", "Education"],
        "skills": [("React", "advanced"), ("TypeScript", "advanced"), ("Tailwind CSS", "advanced"), ("Figma", "intermediate")],
        "availability": Availability.weekends,
        "github": "https://github.com/rahul-demo",
        "experience": "Winner, college web hack 2025",
        "projects": [("Ledger Lite", "Personal finance visualizer for student clubs.", "React, TypeScript", 2025)],
    },
    {
        "email": "meera@hacknova.dev",
        "full_name": "Meera Iyer",
        "college": "COEP Technological University",
        "branch": "AI & DS",
        "year": "TY",
        "bio": "ML engineer interested in evaluation, not just model training.",
        "roles": ["AI/ML", "Data"],
        "domains": ["Healthcare", "Climate"],
        "skills": [("Python", "advanced"), ("PyTorch", "advanced"), ("NLP", "advanced"), ("Data Analysis", "advanced")],
        "availability": Availability.weekdays,
        "github": "https://github.com/meera-demo",
        "experience": "Research intern, 2 hackathons",
        "projects": [("AirWatch", "Neighborhood AQI nowcasting prototype.", "PyTorch, Pandas", 2024)],
    },
    {
        "email": "kabir@hacknova.dev",
        "full_name": "Kabir Joshi",
        "college": "PICT",
        "branch": "CSE-AI",
        "year": "SY",
        "bio": "Product-minded builder who keeps teams honest about scope during sprints.",
        "roles": ["Product", "Presentation"],
        "domains": ["Civic Tech", "Education"],
        "skills": [("Product Strategy", "advanced"), ("Pitching", "advanced"), ("React", "intermediate")],
        "availability": Availability.flexible,
        "github": "https://github.com/kabir-demo",
        "experience": "Finalist, Smart India Hackathon internal",
        "projects": [("Civic Pulse", "Issue tracker for campus facilities.", "React, FastAPI", 2025)],
    },
]


def seed() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == "admin@hacknova.dev")):
            print("Seed already applied.")
            return

        admin = User(
            email="admin@hacknova.dev",
            password_hash=hash_password("Admin@12345"),
            full_name="HackNova Organizer",
            role=UserRole.admin,
            college="HackNova",
            branch="Operations",
            year="Staff",
        )
        admin.profile = Profile(bio="Official organizer account for development.", avatar_seed="organizer")
        db.add(admin)
        db.flush()

        skill_map: dict[str, Skill] = {}
        for name, category in SKILLS:
            skill = Skill(name=name, category=category)
            db.add(skill)
            skill_map[name] = skill
        db.flush()

        users: dict[str, User] = {}
        for row in STUDENTS:
            user = User(
                email=row["email"],
                password_hash=hash_password("Student@123"),
                full_name=row["full_name"],
                role=UserRole.student,
                college=row["college"],
                branch=row["branch"],
                year=row["year"],
            )
            user.profile = Profile(
                bio=row["bio"],
                github_url=row["github"],
                availability=row["availability"],
                hackathon_experience=row["experience"],
                avatar_seed=row["full_name"],
            )
            user.preferred_roles = [UserPreferredRole(role_name=r) for r in row["roles"]]
            user.domains = [UserDomainInterest(domain=d) for d in row["domains"]]
            user.skills = [
                UserSkill(skill=skill_map[name], proficiency=Proficiency(level)) for name, level in row["skills"]
            ]
            user.previous_projects = [
                PreviousProject(title=t, description=d, tech_stack=tech, year=y) for t, d, tech, y in row["projects"]
            ]
            db.add(user)
            users[row["email"]] = user
        db.flush()

        today = date.today()
        events = [
            {
                "name": "PulseForge HealthHack 2026",
                "short": "48 hours to redesign emergency coordination with responsible AI.",
                "desc": "PulseForge brings clinical mentors and city hospitals together with student teams. Build systems that reduce coordination delay without inventing unsupported medical claims.",
                "banner": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80",
                "organizer": "PulseForge Labs",
                "start": today + timedelta(days=12),
                "end": today + timedelta(days=14),
                "reg": today + timedelta(days=10),
                "location": "Pune + Hybrid",
                "domains": ["Healthcare", "AI/ML", "Civic Tech"],
                "status": HackathonStatus.active,
                "rules": "Teams of 2–4. No fabricated clinical claims. Open-source preferred. Mentors available 10:00–22:00 IST. Submissions include repo, 3-minute pitch, and architecture note.",
                "criteria": [
                    ("Technical depth", "Sound architecture and implementation quality", 30),
                    ("Impact", "Evidence that the solution could reduce real operational delay", 25),
                    ("Innovation", "Meaningful differentiation, not novelty for its own sake", 25),
                    ("Communication", "Clarity of problem, constraints, and demo", 20),
                ],
                "problems": [
                    {
                        "code": "PF-01",
                        "title": "Emergency Capacity Coordination",
                        "domain": "Healthcare",
                        "statement": "City ambulances still call hospitals one by one during surges. Dispatchers lack a shared view of bed availability, specialty coverage, and inbound demand.",
                        "description": "Design a coordination layer that helps dispatchers and hospitals share capacity signals and forecast short-term demand.",
                        "target_users": "Ambulance dispatchers, hospital control rooms, municipal emergency cells",
                        "constraints": "No guaranteed live hospital APIs. Must degrade gracefully with delayed or partial data. Cannot replace clinical triage.",
                        "expected_outcome": "A working prototype that visualizes capacity, inbound load, and recommended routing options with explicit uncertainty.",
                        "evaluation": "Data honesty, operational usefulness, architecture, and demo credibility.",
                        "tech": "Python, maps, time-series, role-based dashboards",
                    },
                    {
                        "code": "PF-02",
                        "title": "Post-Discharge Recovery Companion",
                        "domain": "Healthcare",
                        "statement": "Patients leaving cardiac wards miss follow-up windows because instructions live in paper summaries and fragmented chats.",
                        "description": "Build a recovery companion that turns discharge instructions into check-ins, risk flags, and caregiver alerts.",
                        "target_users": "Recently discharged patients, caregivers, outpatient nurses",
                        "constraints": "Must not diagnose. Keep language simple. Work on low-end Android.",
                        "expected_outcome": "A guided 14-day recovery flow with escalation rules a clinician can inspect.",
                        "evaluation": "Safety of claims, usability, and completeness of the care workflow.",
                        "tech": "React, reminders, structured questionnaires",
                    },
                ],
            },
            {
                "name": "GreenByte Climate Sprint",
                "short": "Build climate tools that cities and campuses can actually operate.",
                "desc": "GreenByte asks teams to treat climate software as operations, not a poster. Mentors include campus facilities leads and a municipal sustainability cell.",
                "banner": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
                "organizer": "GreenByte Collective",
                "start": today + timedelta(days=28),
                "end": today + timedelta(days=30),
                "reg": today + timedelta(days=24),
                "location": "Bengaluru",
                "domains": ["Climate", "Data", "Civic Tech"],
                "status": HackathonStatus.published,
                "rules": "Teams of 2–4. Prefer public datasets. Document assumptions. No greenwashing claims.",
                "criteria": [
                    ("Technical", "Working data pipeline and interface", 30),
                    ("Climate relevance", "Clear environmental outcome", 30),
                    ("Feasibility", "Could a campus or ward operate this?", 20),
                    ("Storytelling", "Honest narrative of impact", 20),
                ],
                "problems": [
                    {
                        "code": "GB-01",
                        "title": "Campus Energy Drift Detector",
                        "domain": "Climate",
                        "statement": "Facility teams only notice abnormal electricity use after the monthly bill. Short-lived spikes from labs and events disappear in averages.",
                        "description": "Detect unusual campus energy patterns and explain likely causes without requiring IoT hardware the campus does not have.",
                        "target_users": "Campus facility managers, student sustainability cells",
                        "constraints": "Start from interval meter CSVs. Explain anomalies in plain language.",
                        "expected_outcome": "Anomaly list, likely drivers, and a weekly action digest.",
                        "evaluation": "Signal quality, explainability, and operational usefulness.",
                        "tech": "Python, time-series, dashboards",
                    }
                ],
            },
            {
                "name": "FinForge Student Capital",
                "short": "Responsible money products for first-time earners.",
                "desc": "FinForge is a published event for teams exploring credit literacy, campus payments, and fraud signals without pretending to be a bank.",
                "banner": "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=1600&q=80",
                "organizer": "FinForge Guild",
                "start": today + timedelta(days=45),
                "end": today + timedelta(days=47),
                "reg": today + timedelta(days=40),
                "location": "Mumbai",
                "domains": ["FinTech", "AI/ML", "Product"],
                "status": HackathonStatus.published,
                "rules": "No real money movement. Clearly label simulations. Teams of 2–5.",
                "criteria": [
                    ("Product sense", "Clear user and job-to-be-done", 25),
                    ("Technical", "Working prototype", 30),
                    ("Risk awareness", "Fraud, consent, and bias considered", 25),
                    ("Pitch", "Judge-ready narrative", 20),
                ],
                "problems": [
                    {
                        "code": "FF-01",
                        "title": "First Paycheck Navigator",
                        "domain": "FinTech",
                        "statement": "Interns receive their first stipend with no structured help for tax, rent sharing, or scam SMS filtering.",
                        "description": "Create a navigator that explains stipend cashflow and flags likely scam patterns using the user's own labeled examples.",
                        "target_users": "Student interns, first-time earners",
                        "constraints": "No bank login scraping. Education first, not investment advice.",
                        "expected_outcome": "A stipend plan plus a transparent scam-warning module.",
                        "evaluation": "Clarity, safety of advice, and prototype completeness.",
                        "tech": "React, classification, explainable rules",
                    }
                ],
            },
            {
                "name": "EduNova Learning Lab",
                "short": "Draft event for organizers — not visible to students until published.",
                "desc": "Internal draft used to practice the organizer workflow. Students should never see this until an admin publishes it.",
                "banner": "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1600&q=80",
                "organizer": "EduNova",
                "start": today + timedelta(days=60),
                "end": today + timedelta(days=62),
                "reg": today + timedelta(days=55),
                "location": "Remote",
                "domains": ["Education"],
                "status": HackathonStatus.draft,
                "rules": "Draft only.",
                "criteria": [("Technical", "Working demo", 100)],
                "problems": [],
            },
        ]

        created_hackathons: list[Hackathon] = []
        for event in events:
            hackathon = Hackathon(
                name=event["name"],
                slug=unique_slug(db, event["name"]),
                description=event["desc"],
                short_description=event["short"],
                banner_url=event["banner"],
                organizer=event["organizer"],
                start_date=event["start"],
                end_date=event["end"],
                registration_deadline=event["reg"],
                location=event["location"],
                team_size_min=2,
                team_size_max=4 if "5" not in event["rules"] else 5,
                rules=event["rules"],
                status=event["status"],
                created_by=admin.id,
                domains=[HackathonDomain(domain=d) for d in event["domains"]],
                criteria=[
                    JudgingCriterion(title=t, description=d, weight=w) for t, d, w in event["criteria"]
                ],
                problems=[
                    HackathonProblem(
                        code=p["code"],
                        title=p["title"],
                        statement=p["statement"],
                        description=p["description"],
                        domain=p["domain"],
                        target_users=p["target_users"],
                        constraints=p["constraints"],
                        expected_outcome=p["expected_outcome"],
                        evaluation_criteria=p["evaluation"],
                        required_technologies=p["tech"],
                    )
                    for p in event["problems"]
                ],
            )
            db.add(hackathon)
            created_hackathons.append(hackathon)
        db.flush()

        pulse = created_hackathons[0]
        team = Team(
            hackathon_id=pulse.id,
            name="Signal Room",
            invite_code=generate_invite_code(db),
            leader_id=users["aditi@hacknova.dev"].id,
        )
        db.add(team)
        db.flush()
        db.add_all(
            [
                TeamMember(team_id=team.id, user_id=users["aditi@hacknova.dev"].id, member_role="Backend Lead", status=MemberStatus.active),
                TeamMember(team_id=team.id, user_id=users["rahul@hacknova.dev"].id, member_role="Frontend", status=MemberStatus.active),
            ]
        )
        db.add(
            TeamProblemSelection(
                team_id=team.id,
                problem_id=pulse.problems[0].id,
                selected_by=users["aditi@hacknova.dev"].id,
            )
        )
        db.commit()
        print("Seed complete.")
        print("Admin: admin@hacknova.dev / Admin@12345")
        print("Students: aditi@hacknova.dev, rahul@hacknova.dev, meera@hacknova.dev, kabir@hacknova.dev / Student@123")
        print(f"Demo team invite code: {team.invite_code}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
