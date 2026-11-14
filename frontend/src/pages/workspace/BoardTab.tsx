import { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  AlertCircle,
} from "lucide-react";
import type { Task, Member, Milestone, TaskStatus, TaskPriority } from "../../types";
import { Badge } from "../../components/Badge";

interface BoardTabProps {
  projectId: string;
  tasks: Task[];
  members: Member[];
  milestones: Milestone[];
  isLeader: boolean;
  isMember: boolean;
  currentUserId: string;
  onTaskClick: (task: Task) => void;
  onNewTask: (status: TaskStatus) => void;
  onMoveTask: (taskId: string, targetStatus: TaskStatus, newPosition: number) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

const COLUMNS: { id: TaskStatus; label: string; headerColor: string }[] = [
  { id: "todo", label: "To Do", headerColor: "border-slate-300 bg-slate-50 text-slate-700" },
  { id: "in_progress", label: "In Progress", headerColor: "border-blue-300 bg-blue-50 text-blue-700" },
  { id: "review", label: "Review", headerColor: "border-amber-300 bg-amber-50 text-amber-700" },
  { id: "completed", label: "Completed", headerColor: "border-emerald-300 bg-emerald-50 text-emerald-700" },
];

export function BoardTab({
  tasks,
  isLeader,
  isMember,
  currentUserId,
  onTaskClick,
  onNewTask,
  onMoveTask,
  onDeleteTask,
}: BoardTabProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Group tasks by status and sort by position ascending
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    todo: tasks.filter((t) => t.status === "todo").sort((a, b) => a.position - b.position),
    in_progress: tasks.filter((t) => t.status === "in_progress").sort((a, b) => a.position - b.position),
    review: tasks.filter((t) => t.status === "review").sort((a, b) => a.position - b.position),
    completed: tasks.filter((t) => t.status === "completed").sort((a, b) => a.position - b.position),
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

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === "completed") return false;
    const due = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!isMember) return;
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
    setDragOverTaskId(null);
  };

  const handleDragOverColumn = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDropOnColumn = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    // Default to bottom of column
    const colTasks = tasksByStatus[targetStatus];
    const newPosition = colTasks.length;

    setDragOverColumn(null);
    setDragOverTaskId(null);
    setDraggedTaskId(null);

    try {
      setActionError(null);
      await onMoveTask(taskId, targetStatus, newPosition);
    } catch (err: any) {
      setActionError(err.message || "Failed to move task");
    }
  };

  const handleDropOnTask = async (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId || taskId === targetTask.id) return;

    const targetStatus = targetTask.status;
    const newPosition = targetTask.position;

    setDragOverColumn(null);
    setDragOverTaskId(null);
    setDraggedTaskId(null);

    try {
      setActionError(null);
      await onMoveTask(taskId, targetStatus, newPosition);
    } catch (err: any) {
      setActionError(err.message || "Failed to move task");
    }
  };

  const handleQuickStatusChange = async (task: Task, nextStatus: TaskStatus) => {
    if (task.status === nextStatus) return;
    try {
      setActionError(null);
      const targetCol = tasksByStatus[nextStatus];
      await onMoveTask(task.id, nextStatus, targetCol.length);
    } catch (err: any) {
      setActionError(err.message || "Failed to move task");
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#991B1B]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 4 Column Kanban Board */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus[col.id];
          const isOverThisCol = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOverColumn(e, col.id)}
              onDrop={(e) => handleDropOnColumn(e, col.id)}
              className={`flex flex-col rounded-card border bg-canvas/60 p-3 transition-colors min-h-[500px] ${
                isOverThisCol ? "border-primary bg-primary/5" : "border-line"
              }`}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${col.headerColor}`}>
                    {col.label}
                  </span>
                  <span className="text-xs font-semibold text-mute">({colTasks.length})</span>
                </div>
                {isMember && (
                  <button
                    onClick={() => onNewTask(col.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-white text-mute hover:border-primary hover:text-primary"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Tasks List Container */}
              <div className="flex-1 space-y-2.5">
                {colTasks.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-line text-center text-xs text-mute">
                    <span>No tasks</span>
                    {isMember && (
                      <button
                        onClick={() => onNewTask(col.id)}
                        className="mt-1 font-semibold text-primary hover:underline"
                      >
                        + Add a task
                      </button>
                    )}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isDragging = draggedTaskId === task.id;
                    const canDelete = isLeader || task.creator_id === currentUserId;
                    const overdue = isOverdue(task);

                    return (
                      <div
                        key={task.id}
                        draggable={isMember}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverTaskId(task.id);
                        }}
                        onDrop={(e) => handleDropOnTask(e, task)}
                        className={`group relative rounded-xl border bg-white p-3.5 shadow-sm transition-all ${
                          isDragging ? "opacity-40 shadow-none" : "hover:border-primary/50 hover:shadow-cardHover"
                        } ${
                          dragOverTaskId === task.id ? "border-t-2 border-t-primary" : "border-line"
                        }`}
                      >
                        {/* Task Priority & Quick Actions */}
                        <div className="mb-2 flex items-center justify-between">
                          <Badge tone={priorityTone(task.priority)}>
                            {task.priority.toUpperCase()}
                          </Badge>

                          <div className="flex items-center gap-1">
                            {/* Quick status dropdown for mobile / accessibility */}
                            <select
                              aria-label={`Change status for ${task.title}`}
                              value={task.status}
                              onChange={(e) =>
                                handleQuickStatusChange(task, e.target.value as TaskStatus)
                              }
                              disabled={!isMember}
                              className="rounded border border-line bg-canvas/50 px-1 py-0.5 text-[10px] font-medium text-mute outline-none focus:border-primary"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Prog</option>
                              <option value="review">Review</option>
                              <option value="completed">Done</option>
                            </select>

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
                        </div>

                        {/* Title & Description preview */}
                        <h4
                          onClick={() => onTaskClick(task)}
                          className="cursor-pointer text-sm font-semibold text-ink line-clamp-2 hover:text-primary"
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-mute">
                            {task.description}
                          </p>
                        )}

                        {/* Milestone Tag */}
                        {task.milestone_title && (
                          <div className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-primary">
                            <Layers className="h-3 w-3 shrink-0" />
                            <span className="truncate">{task.milestone_title}</span>
                          </div>
                        )}

                        {/* Footer: Due date & Assignee */}
                        <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-xs">
                          {task.due_date ? (
                            <span
                              className={`flex items-center gap-1 text-[11px] font-medium ${
                                overdue ? "text-[#EF4444]" : "text-mute"
                              }`}
                            >
                              <Calendar className="h-3 w-3" />
                              <span>{task.due_date}</span>
                              {overdue && <span className="font-bold">!</span>}
                            </span>
                          ) : (
                            <span className="text-[11px] text-mute/50">No date</span>
                          )}

                          <div className="flex items-center gap-1.5">
                            {task.assignee_name ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink border border-line"
                                title={`Assigned to ${task.assignee_name}`}
                              >
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
                                  {task.assignee_name.charAt(0).toUpperCase()}
                                </span>
                                <span className="max-w-[70px] truncate">{task.assignee_name}</span>
                              </span>
                            ) : (
                              <span className="rounded bg-canvas px-1.5 py-0.5 text-[10px] text-mute">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
