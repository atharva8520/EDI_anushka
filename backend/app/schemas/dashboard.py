from pydantic import BaseModel


class NextAction(BaseModel):
    title: str
    description: str
    cta: str
    href: str


class Insight(BaseModel):
    key: str
    label: str
    status: str
    detail: str


class ActiveHackathonPanel(BaseModel):
    hackathon_id: str
    hackathon_name: str
    status: str
    deadline: str
    team_name: str | None
    problem_title: str | None
    member_count: int
    progress: int


class StudentDashboard(BaseModel):
    greeting_name: str
    profile_completion: int
    active: ActiveHackathonPanel | None
    insights: list[Insight]
    next_action: NextAction


class AdminStats(BaseModel):
    total_hackathons: int
    active_hackathons: int
    published_hackathons: int
    participants: int
    teams: int
    problems: int
