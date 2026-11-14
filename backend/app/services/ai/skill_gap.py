"""Technology parsing, resolution, and skill-gap analysis."""

from __future__ import annotations

import re
from typing import Any

from app.services.ai.constants import (
    KEYWORD_CATEGORY_MAP,
    PROFICIENCY_WEIGHTS,
    PROTECTED_SLASH_TERMS,
    ROLE_CATEGORIES,
    TECH_ALIAS_MAP,
)


def tokenize_technologies(raw_tech: str | None) -> list[str]:
    """Tokenize free-text technologies by commas, semicolons, and slashes,

    preserving protected slash terms like ai/ml, ui/ux, ci/cd.
    """
    if not raw_tech:
        return []

    text = raw_tech
    # Protect known slash terms
    placeholders: dict[str, str] = {}
    for i, term in enumerate(PROTECTED_SLASH_TERMS):
        pattern = re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)
        ph = f"__PROTECTED_SLASH_{i}__"

        def _sub(m: re.Match[str], repl: str = ph) -> str:
            placeholders[repl] = m.group(0)
            return repl

        text = pattern.sub(_sub, text)

    # Split on comma, semicolon, or slash
    raw_tokens = re.split(r"[,;/]+", text)
    tokens: list[str] = []
    for t in raw_tokens:
        tok = t.strip()
        if not tok:
            continue
        # Restore protected terms
        for ph, orig in placeholders.items():
            if ph in tok:
                tok = tok.replace(ph, orig)
        tok_clean = tok.strip()
        if tok_clean:
            tokens.append(tok_clean)

    return tokens


def resolve_tech_term(
    term: str,
    known_skills_by_name: dict[str, Any],
) -> dict[str, Any]:
    """Resolve a single technology token into:

    - skill-level match (only if Skill exists in known_skills_by_name)
    - category-level match (keyword inside term, longest keyword first)
    - unclassified
    """
    term_lower = term.lower()

    # Step A: Exact or alias match to a Skill name
    target_skill_name = TECH_ALIAS_MAP.get(term_lower, term)
    target_lower = target_skill_name.lower()

    if target_lower in known_skills_by_name:
        skill = known_skills_by_name[target_lower]
        return {
            "type": "skill",
            "term": term,
            "skill_id": str(skill.id),
            "name": skill.name,
            "category": skill.category,
        }

    # Step B: Keyword-to-category match inside the term
    # Match longest keyword first, alphabetical on ties
    sorted_keywords = sorted(
        KEYWORD_CATEGORY_MAP.keys(),
        key=lambda k: (-len(k), k),
    )
    for kw in sorted_keywords:
        # Match whole-word / whole-phrase within term
        pattern = re.compile(rf"(?<![a-zA-Z0-9_-]){re.escape(kw)}(?![a-zA-Z0-9_-])", re.IGNORECASE)
        if pattern.search(term):
            category = KEYWORD_CATEGORY_MAP[kw]
            return {
                "type": "category",
                "term": term,
                "keyword": kw,
                "category": category,
            }

    # Step C: Unclassified
    return {
        "type": "unclassified",
        "term": term,
    }


def compute_category_strengths(members: list[Any]) -> dict[str, int]:
    """Compute category strength as sum of proficiency weights (1, 2, 3)

    of all active members' skills in that category.
    """
    strengths: dict[str, int] = {cat: 0 for cat in ROLE_CATEGORIES}
    for m in members:
        user = getattr(m, "user", None) or m
        skills = getattr(user, "skills", []) or []
        for us in skills:
            skill = getattr(us, "skill", None)
            if not skill:
                continue
            cat = skill.category
            prof_val = getattr(us.proficiency, "value", str(us.proficiency)).lower()
            weight = PROFICIENCY_WEIGHTS.get(prof_val, 1)
            if cat in strengths:
                strengths[cat] += weight
            else:
                strengths[cat] = weight
    return strengths


def analyze_skill_gap(
    required_technologies: str | None,
    members: list[Any],
    known_skills_by_name: dict[str, Any],
) -> dict[str, Any]:
    """Analyze skill gap against problem's required technologies."""
    tokens = tokenize_technologies(required_technologies)

    # Pre-index active member skills
    member_skills_by_name: dict[str, list[str]] = {}
    for m in members:
        user = getattr(m, "user", None) or m
        for us in getattr(user, "skills", []) or []:
            skill = getattr(us, "skill", None)
            if not skill:
                continue
            sname = skill.name.lower()
            prof_val = getattr(us.proficiency, "value", str(us.proficiency)).lower()
            member_skills_by_name.setdefault(sname, []).append(prof_val)

    category_strengths = compute_category_strengths(members)

    covered: list[dict[str, Any]] = []
    partial: list[dict[str, Any]] = []
    missing: list[dict[str, Any]] = []
    unclassified: list[str] = []

    for tok in tokens:
        res = resolve_tech_term(tok, known_skills_by_name)
        if res["type"] == "skill":
            sname_lower = res["name"].lower()
            prof_list = member_skills_by_name.get(sname_lower, [])
            if any(p in {"intermediate", "advanced"} for p in prof_list):
                covered.append({**res, "status": "covered"})
            elif any(p == "beginner" for p in prof_list):
                partial.append({**res, "status": "partial"})
            else:
                missing.append({**res, "status": "missing"})
        elif res["type"] == "category":
            cat = res["category"]
            strength = category_strengths.get(cat, 0)
            if strength >= 3:
                covered.append({**res, "status": "covered", "strength": strength})
            elif strength in {1, 2}:
                partial.append({**res, "status": "partial", "strength": strength})
            else:
                missing.append({**res, "status": "missing", "strength": strength})
        else:
            unclassified.append(tok)

    summary = {
        "total_required": len(tokens),
        "covered": len(covered),
        "partial": len(partial),
        "missing": len(missing),
        "unclassified": len(unclassified),
    }

    return {
        "covered": covered,
        "partial": partial,
        "missing": missing,
        "unclassified": unclassified,
        "summary": summary,
    }


def determine_c_target(
    skill_gap_result: dict[str, Any] | None,
    category_strengths: dict[str, int],
) -> list[str]:
    """C_target priority:

    (a) if a problem is selected and its skill-gap result has missing or partial items,
        use the categories of those items (a skill-level item maps to its Skill.category);
    (b) else the categories with strength 0;
    (c) else the thin categories (strength < 3);
    (d) else all categories.
    Order is deterministic.
    """
    if skill_gap_result:
        gap_items = skill_gap_result.get("missing", []) + skill_gap_result.get("partial", [])
        gap_cats: list[str] = []
        for it in gap_items:
            cat = it.get("category")
            if cat and cat not in gap_cats:
                gap_cats.append(cat)
        if gap_cats:
            # Deterministic order preserving ROLE_CATEGORIES order
            return [c for c in ROLE_CATEGORIES if c in gap_cats]

    # (b) strength == 0
    zero_cats = [c for c in ROLE_CATEGORIES if category_strengths.get(c, 0) == 0]
    if zero_cats:
        return zero_cats

    # (c) thin categories (strength < 3)
    thin_cats = [c for c in ROLE_CATEGORIES if category_strengths.get(c, 0) < 3]
    if thin_cats:
        return thin_cats

    # (d) all categories
    return list(ROLE_CATEGORIES)
