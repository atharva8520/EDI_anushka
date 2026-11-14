import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  Kanban,
  ListTodo,
  Layers,
  Activity,
  Plus,
  AlertCircle,
  Users,
  Award,
  Sparkles,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type {
  TeamWorkspace,
  Member,
  Project,
  ProjectSummary,
  Task,
  Milestone,
  TaskStatus,
} from "../../types";
import { PageIntro } from "../../components/PageIntro";
import { Button } from "../../components/Button";
import { Card, EmptyState, ErrorState, Skeleton } from "../../components/States";
import { Input, TextArea } from "../../components/Field";
import { Badge } from "../../components/Badge";

import { SummaryCards } from "./SummaryCards";
import { BoardTab } from "./BoardTab";
import { ListTab } from "./ListTab";
import { MilestonesTab } from "./MilestonesTab";
import { ActivityTab } from "./ActivityTab";
import { TaskModal } from "./TaskModal";

type ActiveTab = "board" | "list" | "milestones" | "activity";

export function WorkspacePage() {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Core state
  const [teamWorkspace, setTeamWorkspace] = useState<TeamWorkspace | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<ActiveTab>("board");

  // Project creation form (for leader when project is not created yet)
  const [customTitle, setCustomTitle] = useState("");
  const [customSummary, setCustomSummary] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  // Task modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskInitialStatus, setNewTaskInitialStatus] = useState<TaskStatus>("todo");

  // Helper checks
  const isLeader = Boolean(teamWorkspace?.team?.is_leader);
  const isMember = Boolean(
    teamWorkspace?.team?.members.some(
      (m: Member) => m.user_id === profile?.id && m.status === "active"
    )
  );

  // Load all workspace data
  const loadWorkspaceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setActionError(null);

      // 1. Fetch team workspace
      const teamRes = await api.get<TeamWorkspace | null>("/teams/mine");
      const tw = teamRes.data;
      setTeamWorkspace(tw);

      if (!tw || !tw.team) {
        setProject(null);
        return;
      }

      // 2. Fetch project
      const projRes = await api.get<Project | null>("/projects/mine");
      const proj = projRes.data;
      setProject(proj);

      if (!proj) {
        return;
      }

      // 3. Fetch summary, tasks, and milestones in parallel
      const [sumRes, tasksRes, milesRes] = await Promise.all([
        api.get<ProjectSummary>(`/projects/${proj.id}/summary`),
        api.get<Task[]>(`/projects/${proj.id}/tasks`),
        api.get<Milestone[]>(`/projects/${proj.id}/milestones`),
      ]);

      setSummary(sumRes.data);
      setTasks(tasksRes.data);
      setMilestones(milesRes.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Refresh tasks and summary only (for quick reloads)
  const refreshProjectData = useCallback(async () => {
    if (!project) return;
    try {
      const [sumRes, tasksRes, milesRes] = await Promise.all([
        api.get<ProjectSummary>(`/projects/${project.id}/summary`),
        api.get<Task[]>(`/projects/${project.id}/tasks`),
        api.get<Milestone[]>(`/projects/${project.id}/milestones`),
      ]);
      setSummary(sumRes.data);
      setTasks(tasksRes.data);
      setMilestones(milesRes.data);
    } catch (err) {
      setActionError(apiError(err));
    }
  }, [project]);

  // Handle project creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamWorkspace?.team) return;

    setCreatingProject(true);
    setActionError(null);

    try {
      await api.post(`/teams/${teamWorkspace.team.id}/project`, {
        title: customTitle.trim() || undefined,
        summary: customSummary.trim() || undefined,
      });
      await loadWorkspaceData();
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setCreatingProject(false);
    }
  };

  // Optimistic task move with rollback
  const handleMoveTask = async (
    taskId: string,
    targetStatus: TaskStatus,
    newPosition: number
  ) => {
    const previousTasks = [...tasks];

    // Optimistic UI update
    setTasks((prev) => {
      const currentTask = prev.find((t) => t.id === taskId);
      if (!currentTask) return prev;

      const updated = prev.filter((t) => t.id !== taskId);
      const targetColTasks = updated
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => a.position - b.position);

      const clampedPos = Math.min(Math.max(0, newPosition), targetColTasks.length);
      const movedTask: Task = {
        ...currentTask,
        status: targetStatus,
        position: clampedPos,
        completed_at: targetStatus === "completed" ? new Date().toISOString() : null,
      };

      targetColTasks.splice(clampedPos, 0, movedTask);
      targetColTasks.forEach((t, idx) => {
        t.position = idx;
      });

      return [
        ...updated.filter((t) => t.status !== targetStatus),
        ...targetColTasks,
      ];
    });

    try {
      await api.patch(`/tasks/${taskId}/move`, {
        status: targetStatus,
        position: newPosition,
      });
      // Silently re-sync summary
      if (project) {
        api.get<ProjectSummary>(`/projects/${project.id}/summary`).then((res) => {
          setSummary(res.data);
        });
      }
    } catch (err) {
      // Rollback on error
      setTasks(previousTasks);
      setActionError(apiError(err));
      throw err;
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      setActionError(null);
      await api.delete(`/tasks/${taskId}`);
      await refreshProjectData();
    } catch (err) {
      setActionError(apiError(err));
    }
  };

  // Open task create modal
  const handleOpenNewTask = (status: TaskStatus = "todo") => {
    setSelectedTask(null);
    setNewTaskInitialStatus(status);
    setTaskModalOpen(true);
  };

  // Open task edit modal
  const handleOpenEditTask = (task: Task) => {
    setSelectedTask(task);
    setTaskModalOpen(true);
  };

  // Active squad members for assignment
  const activeMembers: Member[] =
    teamWorkspace?.team?.members.filter((m: Member) => m.status === "active") || [];

  // ================= STATE BRANCHES =================

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <PageIntro
          kicker="Workspace"
          title="Project Workspace"
          body="Manage tasks, track milestones, and ship your solution."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (error && !teamWorkspace) {
    return (
      <div className="space-y-6">
        <PageIntro
          kicker="Workspace"
          title="Project Workspace"
          body="Manage tasks, track milestones, and ship your solution."
        />
        <ErrorState message={error} onRetry={loadWorkspaceData} />
      </div>
    );
  }

  // Branch 1: No active team
  if (!teamWorkspace || !teamWorkspace.team) {
    return (
      <div className="space-y-6">
        <PageIntro
          kicker="Workspace"
          title="Project Workspace"
          body="Manage tasks, track milestones, and ship your solution."
        />
        <EmptyState
          title="No Active Team Found"
          body="You must join or create a team before accessing the project workspace and Kanban board."
          action={
            <Link to="/app/team">
              <Button variant="primary">
                <Users className="h-4 w-4" />
                Go to Team Formation
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  // Branch 2: Team has no problem selected yet
  if (!teamWorkspace.team.selected_problem) {
    return (
      <div className="space-y-6">
        <PageIntro
          kicker={teamWorkspace.team.name}
          title="Project Workspace"
          body={`Team workspace for ${teamWorkspace.team.hackathon_name}.`}
        />
        <EmptyState
          title="Problem Selection Required"
          body="Your team must select a problem statement before you can initialize your project workspace and Kanban board."
          action={
            <Link to={`/app/hackathons/${teamWorkspace.team.hackathon_id}`}>
              <Button variant="primary">
                <Award className="h-4 w-4" />
                Select Problem Statement
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  // Branch 3: Team has selected a problem, but project is not created yet
  if (!project) {
    return (
      <div className="space-y-6">
        <PageIntro
          kicker={teamWorkspace.team.name}
          title="Initialize Project Workspace"
          body={`Selected Problem: "${teamWorkspace.team.selected_problem.title}".`}
        />

        {actionError && (
          <div className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#991B1B]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {isLeader ? (
          <Card className="max-w-xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-ink">
                Start Your Project Workspace
              </h3>
            </div>
            <p className="mb-5 text-xs text-mute leading-relaxed">
              As team leader, initialize your project workspace to unlock the Kanban
              board, sprint milestones, workload tracking, and real-time activity feed
              for your squad.
            </p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <Input
                label="Project Title"
                placeholder={`${teamWorkspace.team.name} - ${teamWorkspace.team.selected_problem.title}`}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                hint="Leave empty to use the default team and problem title."
              />

              <TextArea
                label="Project Summary / Pitch (Optional)"
                placeholder="Briefly describe your solution architecture, target users, or key features..."
                value={customSummary}
                onChange={(e) => setCustomSummary(e.target.value)}
              />

              <div className="pt-2">
                <Button type="submit" loading={creatingProject} className="w-full">
                  Create Workspace & Kanban Board
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="max-w-xl p-6 text-center">
            <FolderKanban className="mx-auto h-12 w-12 text-primary/40" />
            <h3 className="mt-3 text-base font-bold text-ink">
              Waiting for Team Leader
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-xs text-mute leading-relaxed">
              Your team leader has not initialized the project workspace yet. Once the
              leader sets up the workspace, you and your teammates will be able to
              collaborate on tasks, milestones, and deliverables.
            </p>
          </Card>
        )}
      </div>
    );
  }

  // Branch 4: Full Active Project Workspace
  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {teamWorkspace.team.name}
            </span>
            <span className="text-mute">•</span>
            <Badge tone="info">{project.problem_title || "Problem Workspace"}</Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {project.title}
          </h1>
          {project.summary && (
            <p className="mt-1 text-xs text-mute max-w-2xl line-clamp-2">
              {project.summary}
            </p>
          )}
        </div>

        {/* Global Action: New Task */}
        {isMember && (
          <Button onClick={() => handleOpenNewTask("todo")} variant="primary">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      {/* Global Inline Error Banner */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#991B1B]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <SummaryCards summary={summary} loading={loading} />

      {/* Workspace Navigation Tabs */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setCurrentTab("board")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            currentTab === "board"
              ? "border-primary text-primary"
              : "border-transparent text-mute hover:text-ink"
          }`}
        >
          <Kanban className="h-4 w-4" />
          Kanban Board ({tasks.length})
        </button>

        <button
          onClick={() => setCurrentTab("list")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            currentTab === "list"
              ? "border-primary text-primary"
              : "border-transparent text-mute hover:text-ink"
          }`}
        >
          <ListTodo className="h-4 w-4" />
          List View
        </button>

        <button
          onClick={() => setCurrentTab("milestones")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            currentTab === "milestones"
              ? "border-primary text-primary"
              : "border-transparent text-mute hover:text-ink"
          }`}
        >
          <Layers className="h-4 w-4" />
          Milestones ({milestones.length})
        </button>

        <button
          onClick={() => setCurrentTab("activity")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            currentTab === "activity"
              ? "border-primary text-primary"
              : "border-transparent text-mute hover:text-ink"
          }`}
        >
          <Activity className="h-4 w-4" />
          Activity Log
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {currentTab === "board" && (
          <BoardTab
            projectId={project.id}
            tasks={tasks}
            members={activeMembers}
            milestones={milestones}
            isLeader={isLeader}
            isMember={isMember}
            currentUserId={profile?.id || ""}
            onTaskClick={handleOpenEditTask}
            onNewTask={(status) => handleOpenNewTask(status)}
            onMoveTask={handleMoveTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {currentTab === "list" && (
          <ListTab
            tasks={tasks}
            members={activeMembers}
            isLeader={isLeader}
            isMember={isMember}
            currentUserId={profile?.id || ""}
            onTaskClick={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onNewTask={() => handleOpenNewTask("todo")}
          />
        )}

        {currentTab === "milestones" && (
          <MilestonesTab
            projectId={project.id}
            milestones={milestones}
            isLeader={isLeader}
            isMember={isMember}
            onRefresh={refreshProjectData}
          />
        )}

        {currentTab === "activity" && <ActivityTab projectId={project.id} />}
      </div>

      {/* Task Create / Edit Modal */}
      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSaved={refreshProjectData}
        task={selectedTask}
        projectId={project.id}
        members={activeMembers}
        milestones={milestones}
        initialStatus={newTaskInitialStatus}
      />
    </div>
  );
}
export default WorkspacePage;
