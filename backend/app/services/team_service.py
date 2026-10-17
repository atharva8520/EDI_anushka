from collections import Counter

from app.models.team import MemberStatus, Team
from app.schemas.team import SkillMapItem

ROLE_CATEGORIES = ["Frontend", "Backend", "AI/ML", "UI/UX", "Data", "Product", "Presentation"]

CATEGORY_ALIASES = {
    "frontend": "Frontend",
    "backend": "Backend",
    "ai/ml": "AI/ML",
    "machine learning": "AI/ML",
    "ui/ux": "UI/UX",
    "design": "UI/UX",
    "data": "Data",
    "product": "Product",
    "presentation": "Presentation",
}


def team_skill_map(team: Team) -> tuple[list[SkillMapItem], list[str]]:
    members = [m for m in team.members if m.status == MemberStatus.active]
    counts: Counter[str] = Counter()
    member_hits: Counter[str] = Counter()

    for member in members:
        seen: set[str] = set()
        for skill in member.user.skills:
            cat = skill.skill.category
            counts[cat] += 1
            seen.add(cat)
        for pref in member.user.preferred_roles:
            mapped = CATEGORY_ALIASES.get(pref.role_name.lower(), pref.role_name)
            seen.add(mapped)
        for cat in seen:
            member_hits[cat] += 1

    max_count = max(counts.values(), default=1)
    items: list[SkillMapItem] = []
    missing: list[str] = []
    for category in ROLE_CATEGORIES:
        coverage = int((counts.get(category, 0) / max_count) * 100) if max_count else 0
        if category not in counts and member_hits.get(category, 0) == 0:
            missing.append(category)
            coverage = 0
        items.append(SkillMapItem(category=category, coverage=coverage, members=member_hits.get(category, 0)))
    return items, missing
