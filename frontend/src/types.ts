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
  repo_url: string | null;
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
  checklist_total: number;
  checklist_done: number;
  checklist_percent: number;
  notes_count: number;
  repo_url: string | null;
}

// Module 6: Execution and Collaboration Features
export interface ProjectNote {
  id: string;
  project_id: string;
  title: string;
  body: string;
  created_by: string | null;
  creator_name: string | null;
  updated_by: string | null;
  updater_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  project_id: string;
  title: string;
  is_done: boolean;
  assignee_id: string | null;
  assignee_name: string | null;
  url: string | null;
  position: number;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Module 5a: Smart Suggestions & Weighted Matching
export interface CandidateScoreBreakdown {
  category_complement: number;
  skill_depth: number;
  domain_overlap: number;
  availability: number;
  preferred_role: number;
}

export interface CandidateRecommendation {
  id: string;
  full_name: string;
  college: string | null;
  branch: string | null;
  year: string | null;
  score: number;
  features: CandidateScoreBreakdown;
  reasons: string[];
  invite_pending: boolean;
}

export interface TeammateRecommendationsResponse {
  run_id: string;
  c_target: string[];
  excluded_incomplete_count: number;
  recommendations: CandidateRecommendation[];
}

export interface SkillGapItem {
  type: "skill" | "category";
  term: string;
  name?: string | null;
  category?: string | null;
  status: "covered" | "partial" | "missing";
  strength?: number | null;
}

export interface SkillGapSummary {
  total_required: number;
  covered: number;
  partial: number;
  missing: number;
  unclassified: number;
}

export interface SkillGapResponse {
  run_id: string;
  problem_id: string;
  problem_title: string;
  problem_code?: string | null;
  covered: SkillGapItem[];
  partial: SkillGapItem[];
  missing: SkillGapItem[];
  unclassified: string[];
  summary: SkillGapSummary;
}

export interface AIFeedbackPayload {
  run_id: string;
  candidate_id?: string | null;
  rating: 1 | -1;
  comment?: string | null;
}

// Module 8: Admin Dashboard Types
export interface AdminTeamListItem {
  id: string;
  name: string;
  hackathon_id: string;
  hackathon_name: string;
  leader_name: string;
  member_count: number;
  team_size_min: number;
  team_size_max: number;
  is_ready: boolean;
  selected_problem_title: string | null;
  has_project: boolean;
  tasks_total: number;
  tasks_completed: number;
  percent_complete: number;
  created_at: string;
}

export interface AdminTeamMember {
  id: string;
  name: string;
  college: string | null;
  member_role: string;
  joined_at: string;
  is_leader: boolean;
}

export interface AdminSelectedProblem {
  id: string;
  code: string;
  title: string;
  domain: string;
}

export interface AdminProjectSummary {
  task_counts: {
    todo: number;
    in_progress: number;
    review: number;
    completed: number;
  };
  percent_complete: number;
  checklist_percent: number;
}

export interface AdminTeamDetail {
  id: string;
  name: string;
  hackathon_id: string;
  hackathon_name: string;
  leader_name: string;
  created_at: string;
  members: AdminTeamMember[];
  selected_problem: AdminSelectedProblem | null;
  project_summary: AdminProjectSummary | null;
}

export interface AdminParticipant {
  id: string;
  full_name: string;
  email: string;
  college: string | null;
  branch: string | null;
  year: string | null;
  team_name: string | null;
}

export interface AdminActivityDay {
  date: string;
  new_students: number;
  new_teams: number;
  tasks_completed: number;
}

export interface AdminHackathonActivity {
  id: string;
  name: string;
  status: HackathonStatus;
  team_count: number;
  participant_count: number;
  ready_team_count: number;
  teams_with_problem: number;
  teams_with_project: number;
  tasks_total: number;
  tasks_completed: number;
}

export interface AdminActivityResponse {
  days: number;
  series: AdminActivityDay[];
  hackathons: AdminHackathonActivity[];
}

export interface AIFeedbackSummary {
  total_runs: number;
  total_feedback: number;
  positive_feedback: number;
  negative_feedback: number;
  satisfaction_rate: number;
  runs_with_feedback_rate: number;
  recent_comments?: Array<{
    id: string;
    team_name: string;
    candidate_name: string | null;
    rating: number;
    comment: string | null;
    created_at: string;
  }>;
}

