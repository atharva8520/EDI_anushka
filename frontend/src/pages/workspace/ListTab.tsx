import { useState, useMemo } from "react";
import { Search, Calendar, Layers, Trash2, Edit2 } from "lucide-react";
import type { Task, Member, TaskStatus, TaskPriority } from "../../types";
import { Badge } from "../../components/Badge";
import { Card, EmptyState } from "../../components/States";
import { Button } from "../../components/Button";

interface ListTabProps {
  tasks: Task[];
  members: Member[];
  isLeader: boolean;
  isMember: boolean;
  currentUserId: string;
  onTaskClick: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onNewTask: () => void;
}

export function ListTab({
  tasks,
  members,
  isLeader,
  isMember,
  currentUserId,
  onTaskClick,
  onDeleteTask,
  onNewTask,
}: ListTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"created_at" | "due_date" | "priority">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchDesc = task.description ? task.description.toLowerCase().includes(q) : false;
          if (!matchTitle && !matchDesc) return false;
        }
        if (statusFilter !== "all" && task.status !== statusFilter) return false;
        if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
        if (assigneeFilter !== "all") {
          if (assigneeFilter === "unassigned" && task.assignee_id !== null) return false;
          if (assigneeFilter !== "unassigned" && task.assignee_id !== assigneeFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === "created_at") {
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else if (sortBy === "due_date") {
          const aTime = a.due_date ? new Date(a.due_date).getTime() : 0;
          const bTime = b.due_date ? new Date(b.due_date).getTime() : 0;
          cmp = aTime - bTime;
        } else if (sortBy === "priority") {
          const weight = { urgent: 4, high: 3, medium: 2, low: 1 };
          cmp = (weight[a.priority] || 0) - (weight[b.priority] || 0);
        }
        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, sortBy, sortOrder]);

  const statusTone = (status: TaskStatus) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "info";
      case "review":
        return "warning";
      case "todo":
      default:
        return "neutral";
    }
  };

  const priorityTone = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return "danger";
      case "high":
        return "warning";
      case "medium":
        return "primary";
      case "low":
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-mute" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-line bg-canvas/50 pl-9 pr-3 py-2 text-xs text-ink outline-none focus:border-primary"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-line bg-canvas/50 px-3 py-2 text-xs text-ink outline-none focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-line bg-canvas/50 px-3 py-2 text-xs text-ink outline-none focus:border-primary"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-lg border border-line bg-canvas/50 px-3 py-2 text-xs text-ink outline-none focus:border-primary"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split("-") as [any, "asc" | "desc"];
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="rounded-lg border border-line bg-canvas/50 px-3 py-2 text-xs text-ink outline-none focus:border-primary"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="due_date-asc">Due Date (Earliest)</option>
            <option value="priority-desc">Priority (Highest)</option>
          </select>
        </div>
      </Card>

      {/* Tasks Table */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks match criteria"
          body="Try adjusting your search terms or filters."
          action={
            isMember ? (
              <Button onClick={onNewTask} variant="secondary">
                Create a task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-canvas/60 text-[11px] font-bold uppercase tracking-wider text-mute">
              <tr>
                <th className="py-3 pl-4 pr-3">Task</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Priority</th>
                <th className="px-3 py-3">Assignee</th>
                <th className="px-3 py-3">Milestone</th>
                <th className="px-3 py-3">Due Date</th>
                <th className="py-3 pl-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filteredTasks.map((task) => {
                const canDelete = isLeader || task.creator_id === currentUserId;

                return (
                  <tr
                    key={task.id}
                    className="transition-colors hover:bg-canvas/40"
                  >
                    <td className="py-3.5 pl-4 pr-3">
                      <div
                        onClick={() => onTaskClick(task)}
                        className="cursor-pointer font-semibold text-ink hover:text-primary"
                      >
                        {task.title}
                      </div>
                      {task.description && (
                        <p className="mt-0.5 max-w-md truncate text-mute">
                          {task.description}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge tone={statusTone(task.status)}>
                        {task.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge tone={priorityTone(task.priority)}>
                        {task.priority.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-3 py-3.5">
                      {task.assignee_name ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                            {task.assignee_name.charAt(0).toUpperCase()}
                          </span>
                          <span>{task.assignee_name}</span>
                        </span>
                      ) : (
                        <span className="text-mute/60 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {task.milestone_title ? (
                        <span className="inline-flex items-center gap-1 font-medium text-primary">
                          <Layers className="h-3 w-3" />
                          <span>{task.milestone_title}</span>
                        </span>
                      ) : (
                        <span className="text-mute/60">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {task.due_date ? (
                        <span className="inline-flex items-center gap-1 text-mute">
                          <Calendar className="h-3 w-3" />
                          <span>{task.due_date}</span>
                        </span>
                      ) : (
                        <span className="text-mute/60">—</span>
                      )}
                    </td>
                    <td className="py-3.5 pl-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isMember && (
                          <button
                            onClick={() => onTaskClick(task)}
                            className="rounded p-1 text-mute hover:bg-canvas hover:text-ink"
                            title="Edit task"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="rounded p-1 text-mute hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                            title="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
