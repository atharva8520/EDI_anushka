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
    start_date: str | None = None
    end_date: str | None = None
    team_id: str | None = None
    team_name: str | None
    problem_title: str | None
    member_count: int
    progress: int
    team_link: str = "/app/team"
    workspace_link: str = "/app/workspace"


class StudentDashboard(BaseModel):
    greeting_name: str
    profile_completion: int
    active: ActiveHackathonPanel | None
    active_teams: list[ActiveHackathonPanel] = []
    insights: list[Insight]
    next_action: NextAction


class AdminStats(BaseModel):
    total_hackathons: int
    active_hackathons: int
    published_hackathons: int
    participants: int
    teams: int
    problems: int
