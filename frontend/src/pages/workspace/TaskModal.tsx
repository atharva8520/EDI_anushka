import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { api, apiError } from "../../api/client";
import type { Task, Member, Milestone, TaskPriority, TaskStatus } from "../../types";
import { Modal } from "../../components/Modal";
import { Input, TextArea, Select } from "../../components/Field";
import { Button } from "../../components/Button";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  task: Task | null;
  projectId: string;
  members: Member[];
  milestones: Milestone[];
  initialStatus?: TaskStatus;
}

export function TaskModal({
  open,
  onClose,
  onSaved,
  task,
  projectId,
  members,
  milestones,
  initialStatus = "todo",
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setAssigneeId(task.assignee_id || "");
      setMilestoneId(task.milestone_id || "");
      setDueDate(task.due_date || "");
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setAssigneeId("");
      setMilestoneId("");
      setDueDate("");
    }
    setError(null);
  }, [task, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (task) {
        // Edit task: explicitly do NOT send status or position
        const payload: Record<string, any> = {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          assignee_id: assigneeId ? assigneeId : null,
          milestone_id: milestoneId ? milestoneId : null,
          due_date: dueDate ? dueDate : null,
        };
        await api.patch(`/tasks/${task.id}`, payload);
      } else {
        // Create task
        const payload = {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status: initialStatus,
          assignee_id: assigneeId ? assigneeId : null,
          milestone_id: milestoneId ? milestoneId : null,
          due_date: dueDate ? dueDate : null,
        };
        await api.post(`/projects/${projectId}/tasks`, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={task ? "Edit Task" : "Create New Task"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#991B1B]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Task Title *"
          placeholder="e.g. Implement OAuth login endpoint"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />

        <TextArea
          label="Description"
          placeholder="Provide context, acceptance criteria, or relevant links..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>

          <Select
            label="Assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name} ({m.member_role})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Milestone"
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
          >
            <option value="">No Milestone</option>
            {milestones.map((ms) => (
              <option key={ms.id} value={ms.id}>
                {ms.title}
              </option>
            ))}
          </Select>

          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {task ? "Save Changes" : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
