"""Deterministic scoring and ranking algorithms for teammate suggestions."""

from __future__ import annotations

from collections import Counter
from typing import Any
from uuid import UUID

from app.services.ai.constants import (
    CATEGORY_ALIASES,
    PROFICIENCY_WEIGHTS,
    WEIGHT_AVAILABILITY,
    WEIGHT_CATEGORY_COMPLEMENT,
    WEIGHT_DOMAIN_OVERLAP,
    WEIGHT_PREFERRED_ROLE,
    WEIGHT_SKILL_DEPTH,
)


def compute_team_mode_availability(members: list[Any]) -> str:
    """Find the most common availability among active members who set one.

    Defaults to 'flexible' if none or in case of a tie.
    """
    avails: list[str] = []
    for m in members:
        user = getattr(m, "user", None) or m
        profile = getattr(user, "profile", None)
        if not profile:
            continue
        av = getattr(profile, "availability", None)
        if av:
            val = getattr(av, "value", str(av)).lower()
            avails.append(val)

    if not avails:
        return "flexible"

    counts = Counter(avails).most_common()
    if len(counts) > 1 and counts[0][1] == counts[1][1]:
        return "flexible"
    return counts[0][0]


def score_candidate(
    candidate: Any,
    c_target: list[str],
    target_domains: set[str],
    team_mode: str,
) -> dict[str, Any]:
    """Calculate the 5 feature scores, total score, and truthful reasons

    for a candidate against a squad's target gaps and domains.
    """
    user = getattr(candidate, "user", None) or candidate
    skills = getattr(user, "skills", []) or []
    domain_interests = getattr(user, "domains", []) or []
    preferred_roles = getattr(user, "preferred_roles", []) or []
    profile = getattr(user, "profile", None)
    availability_raw = getattr(profile, "availability", None) if profile else None
    cand_avail = getattr(availability_raw, "value", str(availability_raw)).lower() if availability_raw else None

    # Pre-index candidate skills by category
    cand_skills_by_cat: dict[str, list[dict[str, Any]]] = {}
    for us in skills:
        skill = getattr(us, "skill", None)
        if not skill:
            continue
        cat = skill.category
        prof_val = getattr(us.proficiency, "value", str(us.proficiency)).lower()
        cand_skills_by_cat.setdefault(cat, []).append(
            {
                "name": skill.name,
                "category": cat,
                "proficiency": prof_val,
                "weight": PROFICIENCY_WEIGHTS.get(prof_val, 1),
            }
        )

    # Feature 1: Category complement (0.40)
    # Average across C_target
    cat_scores: list[float] = []
    matched_cats_with_skills: list[str] = []
    for c in c_target:
        c_skills = cand_skills_by_cat.get(c, [])
        if c_skills:
            matched_cats_with_skills.append(c)
            cat_sum = sum(s["weight"] for s in c_skills)
            cat_scores.append(min(1.0, cat_sum / 3.0))
        else:
            cat_scores.append(0.0)

    f1 = sum(cat_scores) / len(c_target) if c_target else 0.0

    # Feature 2: Skill depth in thin categories (0.15)
    gap_skills: list[dict[str, Any]] = []
    for c in c_target:
        gap_skills.extend(cand_skills_by_cat.get(c, []))

    if gap_skills:
        f2 = sum(s["weight"] for s in gap_skills) / (3.0 * len(gap_skills))
    else:
        f2 = 0.0

    # Feature 3: Domain overlap (0.20)
    cand_domain_names = [getattr(d, "domain", str(d)).strip() for d in domain_interests]
    cand_domains_lower = {d.lower() for d in cand_domain_names if d}
    matched_domains = [d for d in cand_domain_names if d.lower() in target_domains]

    if not target_domains:
        f3 = 0.5
    else:
        f3 = min(1.0, len(cand_domains_lower.intersection(target_domains)) / len(target_domains))

    # Feature 4: Availability compatibility (0.10)
    f4_is_real_match = False
    if cand_avail is None:
        f4 = 0.5
    elif cand_avail == "flexible":
        f4 = 1.0
        f4_is_real_match = True
    elif cand_avail == team_mode:
        f4 = 1.0
        f4_is_real_match = True
    elif cand_avail == "limited":
        f4 = 0.3
    elif (cand_avail == "weekdays" and team_mode == "weekends") or (
        cand_avail == "weekends" and team_mode == "weekdays"
    ):
        f4 = 0.0
    else:
        f4 = 0.8

    # Feature 5: Preferred-role fit (0.15)
    cand_role_strings = [
        getattr(r, "role_name", getattr(r, "role", str(r))).strip() for r in preferred_roles
    ]
    mapped_cand_roles: set[str] = set()
    for r_str in cand_role_strings:
        mapped = CATEGORY_ALIASES.get(r_str.lower(), r_str)
        mapped_cand_roles.add(mapped)

    matched_roles = [r for r in mapped_cand_roles if r in c_target]
    f5 = min(1.0, len(matched_roles) / len(c_target)) if c_target else 0.0

    # Total score calculation
    raw_score = (
        WEIGHT_CATEGORY_COMPLEMENT * f1
        + WEIGHT_SKILL_DEPTH * f2
        + WEIGHT_DOMAIN_OVERLAP * f3
        + WEIGHT_AVAILABILITY * f4
        + WEIGHT_PREFERRED_ROLE * f5
    )
    score = round(raw_score * 100.0, 1)

    # Truthful Reasons Generation
    # Candidate reasons ranked by weighted contribution
    potential_reasons: list[tuple[float, str]] = []

    # 1. Category complement
    if matched_cats_with_skills and f1 > 0.0:
        display_cats = " and ".join(matched_cats_with_skills[:2])
        potential_reasons.append(
            (WEIGHT_CATEGORY_COMPLEMENT * f1, f"Covers missing {display_cats} skills")
        )

    # 2. Skill depth
    has_advanced = any(s["proficiency"] == "advanced" for s in gap_skills)
    if has_advanced and f2 >= 0.66:
        potential_reasons.append(
            (WEIGHT_SKILL_DEPTH * f2, "Advanced proficiency in squad gap areas")
        )

    # 3. Domain overlap
    if matched_domains and f3 > 0.0:
        display_domains = " and ".join(matched_domains[:2])
        potential_reasons.append(
            (WEIGHT_DOMAIN_OVERLAP * f3, f"Strong interest in {display_domains}")
        )

    # 4. Preferred role
    if matched_roles and f5 > 0.0:
        potential_reasons.append(
            (WEIGHT_PREFERRED_ROLE * f5, f"Preferred role matches needed {matched_roles[0]} discipline")
        )

    # 5. Availability (strictly real match)
    if f4_is_real_match and f4 == 1.0:
        avail_label = cand_avail.capitalize() if cand_avail else "Flexible"
        potential_reasons.append(
            (WEIGHT_AVAILABILITY * f4, f"High schedule compatibility ({avail_label})")
        )

    # Sort potential reasons by contribution descending
    potential_reasons.sort(key=lambda x: -x[0])
    selected_reasons = [r[1] for r in potential_reasons[:3]]
    if not selected_reasons:
        selected_reasons = ["Limited overlap with current team needs"]

    features_dict = {
        "category_complement": round(f1, 4),
        "skill_depth": round(f2, 4),
        "domain_overlap": round(f3, 4),
        "availability": round(f4, 4),
        "preferred_role": round(f5, 4),
    }

    return {
        "score": score,
        "features": features_dict,
        "reasons": selected_reasons,
    }
