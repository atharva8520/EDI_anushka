"""Constants, weights, and alias mappings for smart suggestions and weighted matching."""

from __future__ import annotations

# Feature scoring weights (must sum to 1.0)
WEIGHT_CATEGORY_COMPLEMENT = 0.40
WEIGHT_SKILL_DEPTH = 0.15
WEIGHT_DOMAIN_OVERLAP = 0.20
WEIGHT_AVAILABILITY = 0.10
WEIGHT_PREFERRED_ROLE = 0.15

# Proficiency weights
PROFICIENCY_WEIGHTS: dict[str, int] = {
    "beginner": 1,
    "intermediate": 2,
    "advanced": 3,
}

# Standard discipline categories
ROLE_CATEGORIES: list[str] = [
    "Frontend",
    "Backend",
    "AI/ML",
    "UI/UX",
    "Data",
    "Product",
    "Presentation",
]

# Preferred role string aliases to standard categories
CATEGORY_ALIASES: dict[str, str] = {
    "frontend developer": "Frontend",
    "frontend": "Frontend",
    "ui engineer": "Frontend",
    "backend developer": "Backend",
    "backend": "Backend",
    "api engineer": "Backend",
    "full stack developer": "Backend",
    "ai engineer": "AI/ML",
    "ai/ml": "AI/ML",
    "ml engineer": "AI/ML",
    "machine learning engineer": "AI/ML",
    "data scientist": "AI/ML",
    "ui/ux designer": "UI/UX",
    "ui/ux": "UI/UX",
    "product designer": "UI/UX",
    "data analyst": "Data",
    "data": "Data",
    "data engineer": "Data",
    "product manager": "Product",
    "product": "Product",
    "presentation lead": "Presentation",
    "presentation": "Presentation",
    "pitch lead": "Presentation",
}

# Alias mappings for canonical Skill names (lowercased key -> canonical name)
TECH_ALIAS_MAP: dict[str, str] = {
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
    "machine-learning": "Machine Learning",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "tailwind css": "Tailwind CSS",
    "python": "Python",
    "py": "Python",
    "fastapi": "FastAPI",
    "fast api": "FastAPI",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "javascript": "JavaScript",
    "js": "JavaScript",
    "figma": "Figma",
    "pytorch": "PyTorch",
    "nlp": "NLP",
    "docker": "Docker",
    "go": "Go",
    "golang": "Go",
}

# Protected slash terms that must not be split on '/'
PROTECTED_SLASH_TERMS: list[str] = [
    "ai/ml",
    "ui/ux",
    "ci/cd",
]

# Whole-word / whole-phrase keyword matches mapped to category
# Matching order: longest keyword first, alphabetical on ties
KEYWORD_CATEGORY_MAP: dict[str, str] = {
    "dashboards": "Frontend",
    "dashboard": "Frontend",
    "maps": "Frontend",
    "map": "Frontend",
    "ui": "UI/UX",
    "ux": "UI/UX",
    "figma": "UI/UX",
    "wireframe": "UI/UX",
    "wireframes": "UI/UX",
    "time-series": "Data",
    "analytics": "Data",
    "pipeline": "Data",
    "pipelines": "Data",
    "sql": "Data",
    "classification": "AI/ML",
    "computer vision": "AI/ML",
    "deep learning": "AI/ML",
    "microservices": "Backend",
    "rest api": "Backend",
    "rest": "Backend",
    "apis": "Backend",
    "api": "Backend",
    "auth": "Backend",
    "pitching": "Presentation",
    "pitch": "Presentation",
    "presentation": "Presentation",
    "deck": "Presentation",
    "roadmap": "Product",
    "strategy": "Product",
    "product": "Product",
}
