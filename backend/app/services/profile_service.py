from app.models.user import User


PROFILE_WEIGHTS = {
    "bio": 10,
    "skills": 20,
    "preferred_roles": 15,
    "domains": 15,
    "availability": 10,
    "github_url": 10,
    "previous_projects": 10,
    "hackathon_experience": 5,
    "college": 5,
}


def profile_completion(user: User) -> tuple[int, list[str]]:
    profile = user.profile
    missing: list[str] = []
    score = 0

    checks = {
        "college": bool(user.college),
        "bio": bool(profile and profile.bio),
        "skills": bool(user.skills),
        "preferred_roles": bool(user.preferred_roles),
        "domains": bool(user.domains),
        "availability": bool(profile and profile.availability),
        "github_url": bool(profile and profile.github_url),
        "previous_projects": bool(user.previous_projects),
        "hackathon_experience": bool(profile and profile.hackathon_experience),
    }
    for key, ok in checks.items():
        if ok:
            score += PROFILE_WEIGHTS[key]
        else:
            missing.append(key)
    return min(score, 100), missing
