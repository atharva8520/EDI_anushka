export type UserRole = "student" | "admin";

export type HackathonStatus = "draft" | "published" | "active" | "completed" | "archived";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  profile_complete: boolean;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface UserSkill {
  skill_id: string;
  name: string;
  category: string;
  proficiency: "beginner" | "intermediate" | "advanced";
}

export interface PreviousProject {
  id?: string;
  title: string;
  description?: string | null;
  tech_stack?: string | null;
  year?: number | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  college: string | null;
  branch: string | null;
  year: string | null;
  bio: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  availability: "flexible" | "weekdays" | "weekends" | "limited" | null;
  hackathon_experience: string | null;
  preferred_roles: string[];
  domains: string[];
  skills: UserSkill[];
  previous_projects: PreviousProject[];
  completion_percent: number;
  missing_fields: string[];
}

export interface Criterion {
  id?: string;
  title: string;
  description: string;
  weight: number;
}

export interface HackathonListItem {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  banner_url: string | null;
  organizer: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  location: string;
  team_size_min: number;
  team_size_max: number;
  status: HackathonStatus;
  domains: string[];
  problem_count: number;
  team_count: number;
}

export interface HackathonDetail extends HackathonListItem {
  description: string;
  rules: string;
  criteria: Criterion[];
  created_at: string;
}

export interface ProblemSummary {
  id: string;
  code: string;
  title: string;
  domain: string;
  description: string;
  is_published: boolean;
}

export interface ProblemDetail extends ProblemSummary {
  hackathon_id: string;
  statement: string;
  target_users: string;
  constraints: string;
  expected_outcome: string;
  evaluation_criteria: string;
  required_technologies: string | null;
}

export interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  member_role: string;
  status: string;
  college: string | null;
  skills: UserSkill[];
  preferred_roles: string[];
  availability: string | null;
}

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  hackathon_id: string;
  hackathon_name: string;
  leader_id: string;
  leader_name: string;
  members: Member[];
  selected_problem: {
    id: string;
    code: string;
    title: string;
    domain: string;
    description: string;
    selected_at: string;
  } | null;
  created_at: string;
  is_leader: boolean;
  active_member_count: number;
  team_size_min: number;
  team_size_max: number;
  is_ready: boolean;
  is_full: boolean;
}

export interface SkillMapItem {
  category: string;
  coverage: number;
  members: number;
}

export interface TeamWorkspace {
  team: Team;
  skill_map: SkillMapItem[];
  missing_capabilities: string[];
}

export interface Invite {
  id: string;
  team_id: string;
  team_name: string;
  hackathon_name: string;
  status: string;
  created_at: string;
}

export interface TeamInviteLeader {
  id: string;
  team_id: string;
  invitee_id: string;
  invitee_name: string;
  status: string;
  created_at: string;
}

export interface StudentSearchItem {
  id: string;
  full_name: string;
  college: string | null;
  branch: string | null;
  year: string | null;
  availability: "flexible" | "weekdays" | "weekends" | "limited" | null;
  skills: UserSkill[];
  preferred_roles: string[];
  domains: string[];
}

export interface StudentDashboard {
  greeting_name: string;
  profile_completion: number;
  active: {
    hackathon_id: string;
    hackathon_name: string;
    status: string;
    deadline: string;
    team_name: string | null;
    problem_title: string | null;
    member_count: number;
    progress: number;
  } | null;
  insights: { key: string; label: string; status: string; detail: string }[];
  next_action: { title: string; description: string; cta: string; href: string };
}

export interface AdminStats {
  total_hackathons: number;
  active_hackathons: number;
  published_hackathons: number;
  participants: number;
  teams: number;
  problems: number;
}

// Module 4: Project Workspace & Kanban Board
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "review" | "completed";

export interface Project {
  id: string;
  team_id: string;
  title: string;
  summary: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  problem_title: string | null;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  total_tasks: number;
  completed_tasks: number;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  assignee_id: string | null;
  assignee_name: string | null;
  creator_id: string;
  creator_name: string | null;
  milestone_id: string | null;
  milestone_title: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  actor_id: string;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

export interface MemberWorkload {
  user_id: string;
  full_name: string;
  open_tasks: number;
  completed_tasks: number;
}

export interface MilestoneProgress {
  id: string;
  title: string;
  due_date: string | null;
  total_tasks: number;
  completed_tasks: number;
  percent_complete: number;
}

export interface ProjectSummary {
  total_tasks: number;
  todo_count: number;
  in_progress_count: number;
  review_count: number;
  completed_count: number;
  percent_complete: number;
  overdue_count: number;
  unassigned_count: number;
  workload: MemberWorkload[];
  milestone_progress: MilestoneProgress[];
}
