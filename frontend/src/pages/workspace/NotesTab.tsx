import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import type { ProjectNote } from "../../types";
import { Card, EmptyState, Skeleton } from "../../components/States";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";

interface NotesTabProps {
  projectId: string;
  isLeader: boolean;
  isMember: boolean;
  currentUserId: string;
  onRefresh?: () => Promise<void>;
}

export function NotesTab({
  projectId,
  isLeader,
  isMember,
  currentUserId,
  onRefresh,
}: NotesTabProps) {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Note Modal state (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ProjectNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<ProjectNote | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotes = useCallback(async (query: string = "") => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = { limit: "50" };
      if (query.trim()) {
        params.q = query.trim();
      }
      const res = await api.get<ProjectNote[]>(`/projects/${projectId}/notes`, { params });
      setNotes(res.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchNotes(searchQuery);
  }, [fetchNotes, searchQuery]);

  function handleOpenCreate() {
    setEditingNote(null);
    setNoteTitle("");
    setNoteBody("");
    setActionError(null);
    setModalOpen(true);
  }

  function handleOpenEdit(note: ProjectNote) {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteBody(note.body);
    setActionError(null);
    setModalOpen(true);
  }

  async function handleSaveNote() {
    const trimmedTitle = noteTitle.trim();
    const trimmedBody = noteBody.trim();

    if (!trimmedTitle) {
      setActionError("Note title cannot be empty");
      return;
    }
    if (!trimmedBody) {
      setActionError("Note body cannot be empty");
      return;
    }
    if (trimmedBody.length > 20000) {
      setActionError("Note body cannot exceed 20,000 characters");
      return;
    }

    try {
      setSaving(true);
      setActionError(null);

      if (editingNote) {
        await api.patch(`/notes/${editingNote.id}`, {
          title: trimmedTitle,
          body: trimmedBody,
        });
      } else {
        await api.post(`/projects/${projectId}/notes`, {
          title: trimmedTitle,
          body: trimmedBody,
        });
      }

      setModalOpen(false);
      await fetchNotes(searchQuery);
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  function handleOpenDelete(note: ProjectNote) {
    setNoteToDelete(note);
    setDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!noteToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/notes/${noteToDelete.id}`);
      setDeleteModalOpen(false);
      setNoteToDelete(null);
      await fetchNotes(searchQuery);
      if (onRefresh) await onRefresh();
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setDeleting(false);
    }
  }

  function canDelete(note: ProjectNote): boolean {
    return isLeader || note.created_by === currentUserId;
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <input
            className="w-full rounded-[12px] border border-line bg-white pl-9 pr-3.5 py-2 text-xs text-ink outline-none transition focus:border-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title..."
          />
        </div>

        {isMember && (
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        )}
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#991B1B]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-line p-6 text-center text-xs text-[#DC2626]">
          {error}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No matching notes found" : "No technical notes yet"}
          body={
            searchQuery
              ? `No notes matched "${searchQuery}". Try a different keyword.`
              : "Document project architecture, technical setup instructions, API contracts, and guides."
          }
          action={
            isMember && !searchQuery ? (
              <Button variant="primary" className="!py-1.5 !px-3 !text-xs" onClick={handleOpenCreate}>
                <Plus className="h-3.5 w-3.5" />
                Create First Note
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id} className="p-5 transition hover:shadow-cardHover">
              <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
                <div>
                  <h3 className="text-sm font-bold text-ink">{note.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-mute">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {note.creator_name || "Team Member"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {new Date(note.updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {isMember && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(note)}
                      className="rounded-btn p-1.5 text-mute transition hover:bg-canvas hover:text-ink"
                      title="Edit note"
                      aria-label="Edit note"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {canDelete(note) && (
                      <button
                        onClick={() => handleOpenDelete(note)}
                        className="rounded-btn p-1.5 text-mute transition hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                        title="Delete note"
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Note Plain Text Body with preserved whitespace */}
              <div className="mt-3 text-xs leading-relaxed text-ink whitespace-pre-wrap font-sans">
                {note.body}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Note Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingNote ? "Edit Technical Note" : "New Technical Note"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Title</label>
            <input
              className="w-full rounded-[12px] border border-line bg-white px-3.5 py-2 text-xs text-ink outline-none transition focus:border-primary"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Architecture Overview & Tech Stack"
              maxLength={200}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">Content</label>
              <span className={`text-[10px] ${noteBody.length > 20000 ? "text-[#DC2626] font-bold" : "text-mute"}`}>
                {noteBody.length.toLocaleString()} / 20,000 characters
              </span>
            </div>
            <textarea
              className="w-full rounded-[12px] border border-line bg-white px-3.5 py-2.5 text-xs text-ink outline-none transition focus:border-primary min-h-[180px]"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Write your technical note, architecture choices, or instructions here..."
              rows={10}
            />
          </div>

          {actionError && (
            <p className="text-xs font-semibold text-[#DC2626]">{actionError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" className="!py-1.5 !px-3 !text-xs" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" className="!py-1.5 !px-3 !text-xs" onClick={handleSaveNote} disabled={saving}>
              {saving ? "Saving..." : editingNote ? "Save Changes" : "Create Note"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Technical Note"
      >
        <div className="space-y-4">
          <p className="text-xs text-ink leading-relaxed">
            Are you sure you want to delete note{" "}
            <span className="font-bold">"{noteToDelete?.title}"</span>? This action cannot be undone.
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
              {deleting ? "Deleting..." : "Delete Note"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
