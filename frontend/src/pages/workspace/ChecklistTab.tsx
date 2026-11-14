import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  CheckCircle2,
  ExternalLink,
  Edit2,
  Trash2,
  User,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import type { ChecklistItem, Member } from "../../types";
import { Card, EmptyState, Skeleton } from "../../components/States";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";

interface ChecklistTabProps {
  projectId: string;
  members: Member[];
  isLeader: boolean;
  isMember: boolean;
  currentUserId: string;
  onRefresh?: () => Promise<void>;
}

export function ChecklistTab({
  projectId,
  members,
  isLeader,
  isMember,
  currentUserId,
  onRefresh,
}: ChecklistTabProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Item Modal state (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemAssigneeId, setItemAssigneeId] = useState<string>("");
  const [itemUrl, setItemUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Default checklist loading
  const [addingDefaults, setAddingDefaults] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ChecklistItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchChecklist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ChecklistItem[]>(`/projects/${projectId}/checklist`);
      setItems(res.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // Completion calculation
  const totalItems = items.length;
  const completedItems = items.filter((i) => i.is_done).length;
  const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  async function handleToggle(item: ChecklistItem) {
    if (!isMember) return;
    try {
      setActionError(null);
      const res = await api.patch<ChecklistItem>(`/checklist/${item.id}`, {
        is_done: !item.is_done,
      });

      // Update locally
      setItems((prev) => prev.map((i) => (i.id === item.id ? res.data : i)));
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(apiError(err));
    }
  }

  function handleOpenCreate() {
    setEditingItem(null);
    setItemTitle("");
    setItemAssigneeId("");
    setItemUrl("");
    setActionError(null);
    setModalOpen(true);
  }

  function handleOpenEdit(item: ChecklistItem) {
    setEditingItem(item);
    setItemTitle(item.title);
    setItemAssigneeId(item.assignee_id || "");
    setItemUrl(item.url || "");
    setActionError(null);
    setModalOpen(true);
  }

  async function handleSaveItem() {
    const trimmedTitle = itemTitle.trim();
    const trimmedUrl = itemUrl.trim();

    if (!trimmedTitle) {
      setActionError("Item title cannot be empty");
      return;
    }

    try {
      setSaving(true);
      setActionError(null);

      const payload: Record<string, any> = {
        title: trimmedTitle,
        assignee_id: itemAssigneeId ? itemAssigneeId : null,
        url: trimmedUrl ? trimmedUrl : null,
      };

      if (editingItem) {
        await api.patch(`/checklist/${editingItem.id}`, payload);
      } else {
        await api.post(`/projects/${projectId}/checklist`, payload);
      }

      setModalOpen(false);
      await fetchChecklist();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDefaults() {
    try {
      setAddingDefaults(true);
      setActionError(null);
      await api.post(`/projects/${projectId}/checklist/defaults`);
      await fetchChecklist();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setAddingDefaults(false);
    }
  }

  function handleOpenDelete(item: ChecklistItem) {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/checklist/${itemToDelete.id}`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      await fetchChecklist();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setDeleting(false);
    }
  }

  function canDelete(item: ChecklistItem): boolean {
    return isLeader || item.created_by === currentUserId;
  }

  return (
    <div className="space-y-6">
      {/* Action Error Banner */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#991B1B]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Progress Card & Actions Header */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-mute">
              Submission Readiness
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink">{percentComplete}%</span>
              <span className="text-xs text-mute">
                ({completedItems} of {totalItems} deliverables completed)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMember && totalItems === 0 && (
              <Button
                variant="secondary"
                className="!py-1.5 !px-3 !text-xs"
                onClick={handleAddDefaults}
                disabled={addingDefaults}
              >
                <Sparkles className="h-4 w-4 text-primary" />
                {addingDefaults ? "Adding..." : "Add Standard Checklist"}
              </Button>
            )}

            {isMember && (
              <Button variant="primary" className="!py-1.5 !px-3 !text-xs" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                Add Deliverable
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[#EEF0F6]">
          <div
            className="h-full rounded-full bg-[#16A34A] transition-all duration-500"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </Card>

      {/* Checklist Items List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-line p-6 text-center text-xs text-[#DC2626]">
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No checklist deliverables yet"
          body="Track your repository, documentation, demo video, presentation slides, and submission requirements."
          action={
            isMember ? (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="primary"
                  className="!py-1.5 !px-3 !text-xs"
                  onClick={handleAddDefaults}
                  disabled={addingDefaults}
                >
                  <Sparkles className="h-4 w-4" />
                  {addingDefaults ? "Generating..." : "Generate Standard Checklist"}
                </Button>
                <Button variant="secondary" className="!py-1.5 !px-3 !text-xs" onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4" />
                  Add Custom Item
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const hasClickableUrl =
              Boolean(item.url) &&
              (item.url!.startsWith("http://") || item.url!.startsWith("https://"));

            return (
              <Card
                key={item.id}
                className={`flex items-center justify-between p-4 transition ${
                  item.is_done ? "bg-[#F9FAFB]/70 border-line/60" : "hover:shadow-cardHover"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggle(item)}
                    disabled={!isMember}
                    className={`grid h-6 w-6 place-items-center rounded-md border transition ${
                      item.is_done
                        ? "border-[#16A34A] bg-[#DCFCE7] text-[#16A34A]"
                        : "border-slate-300 bg-white text-transparent hover:border-slate-400"
                    } ${!isMember ? "cursor-default opacity-70" : "cursor-pointer"}`}
                    aria-label={item.is_done ? "Mark as incomplete" : "Mark as complete"}
                  >
                    <CheckCircle2 className={`h-4 w-4 ${item.is_done ? "block" : "hidden"}`} />
                  </button>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold ${
                        item.is_done ? "text-mute line-through" : "text-ink"
                      }`}
                    >
                      {item.title}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-mute">
                      {item.assignee_name && (
                        <span className="flex items-center gap-1 font-medium text-ink">
                          <User className="h-3 w-3 text-mute" />
                          {item.assignee_name}
                        </span>
                      )}

                      {item.url && (
                        hasClickableUrl ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            <span>Link</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="font-mono text-[10px] text-mute">{item.url}</span>
                        )
                      )}

                      {item.is_done && item.completed_at && (
                        <span className="text-[#16A34A]">
                          Completed {new Date(item.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Item Actions */}
                {isMember && (
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="rounded-btn p-1.5 text-mute transition hover:bg-canvas hover:text-ink"
                      title="Edit item"
                      aria-label="Edit item"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {canDelete(item) && (
                      <button
                        onClick={() => handleOpenDelete(item)}
                        className="rounded-btn p-1.5 text-mute transition hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                        title="Delete item"
                        aria-label="Delete item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Item Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? "Edit Deliverable" : "New Deliverable"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Title</label>
            <input
              className="w-full rounded-[12px] border border-line bg-white px-3.5 py-2 text-xs text-ink outline-none transition focus:border-primary"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder="e.g. Repository link added and public"
              maxLength={200}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Assignee (Optional)</label>
            <select
              value={itemAssigneeId}
              onChange={(e) => setItemAssigneeId(e.target.value)}
              className="w-full rounded-btn border border-line bg-surface px-3 py-2 text-xs text-ink transition focus:border-primary focus:outline-none"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.user_id}>
                  {m.full_name || "Member"} ({m.member_role || "Member"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Deliverable URL (Optional)</label>
            <input
              className="w-full rounded-[12px] border border-line bg-white px-3.5 py-2 text-xs text-ink outline-none transition focus:border-primary"
              value={itemUrl}
              onChange={(e) => setItemUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="mt-1 text-[11px] text-mute">
              Link to your demo video, public repo, deployment, or slides.
            </p>
          </div>

          {actionError && (
            <p className="text-xs font-semibold text-[#DC2626]">{actionError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" className="!py-1.5 !px-3 !text-xs" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" className="!py-1.5 !px-3 !text-xs" onClick={handleSaveItem} disabled={saving}>
              {saving ? "Saving..." : editingItem ? "Save Changes" : "Add Deliverable"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Deliverable"
      >
        <div className="space-y-4">
          <p className="text-xs text-ink leading-relaxed">
            Are you sure you want to delete deliverable{" "}
            <span className="font-bold">"{itemToDelete?.title}"</span>?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" className="!py-1.5 !px-3 !text-xs" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="!py-1.5 !px-3 !text-xs"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Item"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
