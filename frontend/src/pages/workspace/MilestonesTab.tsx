import { useState } from "react";
import { Plus, Calendar, Layers, Trash2, Edit2, AlertCircle } from "lucide-react";
import { api, apiError } from "../../api/client";
import type { Milestone } from "../../types";
import { Card, EmptyState } from "../../components/States";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { Input, TextArea } from "../../components/Field";

interface MilestonesTabProps {
  projectId: string;
  milestones: Milestone[];
  isLeader: boolean;
  isMember: boolean;
  onRefresh: () => void;
}

export function MilestonesTab({
  projectId,
  milestones,
  isLeader,
  isMember,
  onRefresh,
}: MilestonesTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingMilestone(null);
    setTitle("");
    setDescription("");
    setDueDate("");
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (m: Milestone) => {
    setEditingMilestone(m);
    setTitle(m.title);
    setDescription(m.description || "");
    setDueDate(m.due_date || "");
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Milestone title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingMilestone) {
        await api.patch(`/milestones/${editingMilestone.id}`, {
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate ? dueDate : null,
        });
      } else {
        await api.post(`/projects/${projectId}/milestones`, {
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate ? dueDate : null,
        });
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/milestones/${id}`);
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#991B1B]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header with CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-ink">Project Milestones</h3>
          <p className="text-xs text-mute">
            Organize work into delivery sprints, phases, and demo deliverables.
          </p>
        </div>
        {isMember && (
          <Button onClick={openCreateModal} variant="primary" className="text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Milestone
          </Button>
        )}
      </div>

      {/* Milestones Grid */}
      {milestones.length === 0 ? (
        <EmptyState
          title="No milestones set yet"
          body="Break down your hackathon project into key target deliverables and tracking deadlines."
          action={
            isMember ? (
              <Button onClick={openCreateModal} variant="secondary">
                Create first milestone
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {milestones.map((m) => {
            const percent =
              m.total_tasks > 0
                ? Math.round((m.completed_tasks / m.total_tasks) * 100)
                : 0;

            return (
              <Card
                key={m.id}
                className="flex flex-col justify-between p-5 transition hover:shadow-cardHover"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Layers className="h-4 w-4" />
                      </span>
                      <h4 className="font-bold text-ink">{m.title}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      {isMember && (
                        <button
                          onClick={() => openEditModal(m)}
                          className="rounded p-1 text-mute hover:bg-canvas hover:text-ink"
                          title="Edit milestone"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isLeader && (
                        <button
                          onClick={() => setDeleteConfirmId(m.id)}
                          className="rounded p-1 text-mute hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                          title="Delete milestone (leader only)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {m.description && (
                    <p className="mt-2.5 text-xs text-mute line-clamp-3">
                      {m.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 space-y-3 border-t border-line/60 pt-3">
                  {/* Progress Bar */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-mute">Task Completion</span>
                      <span className="font-bold text-ink">
                        {m.completed_tasks} / {m.total_tasks} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEF0F6]">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-mute">Target Due Date:</span>
                    <span className="flex items-center gap-1 font-semibold text-ink">
                      <Calendar className="h-3 w-3 text-mute" />
                      {m.due_date || "No deadline"}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        title={editingMilestone ? "Edit Milestone" : "New Milestone"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#991B1B]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Milestone Title *"
            placeholder="e.g. Core API & Database Migration"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <TextArea
            label="Description"
            placeholder="Key outcomes, deliverable checklist..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            label="Target Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {editingMilestone ? "Save Changes" : "Create Milestone"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmId !== null}
        title="Delete Milestone"
        onClose={() => setDeleteConfirmId(null)}
      >
        <div className="space-y-4">
          <p className="text-xs text-mute leading-relaxed">
            Are you sure you want to delete this milestone? Any tasks currently assigned to this
            milestone will <strong className="text-ink">not</strong> be deleted; they will simply
            become unassigned from this milestone.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteConfirmId(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={loading}
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
