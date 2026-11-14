import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { api } from "../../api/client";
import { Card, EmptyState, ErrorState } from "../../components/States";
import { Badge, statusTone } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import type { HackathonDetail, ProblemDetail, ProblemSummary } from "../../types";

interface ProblemFormData {
  code: string;
  title: string;
  domain: string;
  statement: string;
  description: string;
  target_users: string;
  constraints: string;
  expected_outcome: string;
  evaluation_criteria: string;
  required_technologies: string;
  is_published: boolean;
}

const emptyForm: ProblemFormData = {
  code: "",
  title: "",
  domain: "",
  statement: "",
  description: "",
  target_users: "",
  constraints: "",
  expected_outcome: "",
  evaluation_criteria: "",
  required_technologies: "",
  is_published: true,
};

export function AdminProblemsPage() {
  const { id } = useParams<{ id: string }>();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProblemFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [problemToDelete, setProblemToDelete] = useState<ProblemSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Expanded problem detail card view
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, ProblemDetail>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [hRes, pRes] = await Promise.all([
        api.get<HackathonDetail>(`/hackathons/${id}`),
        api.get<ProblemSummary[]>(`/hackathons/${id}/problems`),
      ]);
      setHackathon(hRes.data);
      setProblems(pRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load hackathon problems");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open modal for Create
  function handleOpenCreate() {
    setEditingProblemId(null);
    setFormData({
      ...emptyForm,
      domain: hackathon?.domains?.[0] || "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  // Open modal for Edit
  async function handleOpenEdit(prob: ProblemSummary) {
    setEditingProblemId(prob.id);
    setFormError(null);
    try {
      // Fetch full details
      const res = await api.get<ProblemDetail>(`/problems/${prob.id}`);
      const d = res.data;
      setFormData({
        code: d.code,
        title: d.title,
        domain: d.domain,
        statement: d.statement,
        description: d.description,
        target_users: d.target_users,
        constraints: d.constraints,
        expected_outcome: d.expected_outcome,
        evaluation_criteria: d.evaluation_criteria,
        required_technologies: d.required_technologies || "",
        is_published: d.is_published,
      });
      setModalOpen(true);
    } catch (err: any) {
      setActionError(err.response?.data?.detail || "Failed to load problem statement details");
    }
  }

  // Submit Add / Edit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Validate lengths
    if (formData.code.trim().length < 2) {
      setFormError("Code must be at least 2 characters.");
      return;
    }
    if (formData.title.trim().length < 4) {
      setFormError("Title must be at least 4 characters.");
      return;
    }
    if (formData.statement.trim().length < 20) {
      setFormError("Statement must be at least 20 characters.");
      return;
    }
    if (formData.description.trim().length < 20) {
      setFormError("Description must be at least 20 characters.");
      return;
    }
    if (!formData.domain.trim()) {
      setFormError("Domain is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: formData.code.trim(),
        title: formData.title.trim(),
        domain: formData.domain.trim(),
        statement: formData.statement.trim(),
        description: formData.description.trim(),
        target_users: formData.target_users.trim() || "Any relevant stakeholders",
        constraints: formData.constraints.trim() || "Standard guidelines apply",
        expected_outcome: formData.expected_outcome.trim() || "Functional MVP or prototype",
        evaluation_criteria: formData.evaluation_criteria.trim() || "Innovation, execution, impact",
        required_technologies: formData.required_technologies.trim() || null,
        is_published: formData.is_published,
      };

      if (editingProblemId) {
        await api.put(`/problems/${editingProblemId}`, payload);
        setActionSuccess(`Updated problem statement '${payload.code}' successfully.`);
      } else {
        await api.post(`/hackathons/${id}/problems`, payload);
        setActionSuccess(`Created problem statement '${payload.code}' successfully.`);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Failed to save problem statement");
    } finally {
      setSubmitting(false);
    }
  }

  // Toggle is_published
  async function handleTogglePublish(prob: ProblemSummary) {
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = !prob.is_published;
      await api.put(`/problems/${prob.id}`, { is_published: updated });
      setActionSuccess(
        `Problem statement '${prob.code}' is now ${updated ? "published" : "unpublished"}.`
      );
      loadData();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || "Failed to update publication status");
    }
  }

  // Open delete confirm
  function handleOpenDelete(prob: ProblemSummary) {
    setProblemToDelete(prob);
    setDeleteError(null);
    setDeleteModalOpen(true);
  }

  // Confirm delete
  async function handleConfirmDelete() {
    if (!problemToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/problems/${problemToDelete.id}`);
      setActionSuccess(`Deleted problem statement '${problemToDelete.code}' successfully.`);
      setDeleteModalOpen(false);
      setProblemToDelete(null);
      loadData();
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || "Failed to delete problem statement");
    } finally {
      setDeleting(false);
    }
  }

  // View full details toggle
  async function handleToggleExpand(probId: string) {
    if (expandedId === probId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(probId);
    if (!expandedDetails[probId]) {
      setLoadingDetailId(probId);
      try {
        const res = await api.get<ProblemDetail>(`/problems/${probId}`);
        setExpandedDetails((prev) => ({ ...prev, [probId]: res.data }));
      } catch {
        // Fallback
      } finally {
        setLoadingDetailId(null);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-line border-t-primary" />
        <p className="mt-3 text-xs text-mute">Loading problem statements...</p>
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="space-y-4">
        <Link
          to="/app/admin/hackathons"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Hackathons
        </Link>
        <ErrorState message={error || "Hackathon not found"} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/app/admin/hackathons"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Hackathons
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-ink">{hackathon.name}: Problem Statements</h2>
            <Badge tone={statusTone(hackathon.status)}>{hackathon.status}</Badge>
          </div>
          <p className="text-xs text-mute mt-1">
            Manage track problems, specifications, target users, and constraints for participants.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Problem Statement
        </Button>
      </div>

      {/* Action Messages */}
      {actionError && (
        <div className="rounded-card border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-rose-900">{actionError}</p>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-bold text-rose-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-card border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-900">{actionSuccess}</p>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Problems List */}
      {problems.length === 0 ? (
        <EmptyState
          title="No problem statements yet"
          body="Add track challenges and statements so registered teams can review and select them."
          action={
            <Button onClick={handleOpenCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create First Problem
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {problems.map((prob) => {
            const isExpanded = expandedId === prob.id;
            const detail = expandedDetails[prob.id];

            return (
              <Card key={prob.id} className="p-5 overflow-hidden transition hover:shadow-lift">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-canvas border border-line text-ink">
                        {prob.code}
                      </span>
                      <h3 className="text-base font-bold text-ink truncate">{prob.title}</h3>
                      <Badge tone={prob.is_published ? "success" : "warning"}>
                        {prob.is_published ? "Published" : "Draft"}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-mute bg-canvas px-2 py-0.5 rounded">
                        <Tag className="h-3 w-3" /> {prob.domain}
                      </span>
                    </div>

                    <p className="text-xs text-mute line-clamp-2 mt-1">{prob.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => handleToggleExpand(prob.id)}
                      className="text-xs h-8 px-2.5"
                    >
                      {isExpanded ? "Hide Details" : "View Details"}
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => handleTogglePublish(prob)}
                      className="text-xs h-8 px-2.5 flex items-center gap-1.5"
                      title={prob.is_published ? "Unpublish problem" : "Publish problem"}
                    >
                      {prob.is_published ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                          <span>Unpublish</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Publish</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => handleOpenEdit(prob)}
                      className="text-xs h-8 px-2.5 flex items-center gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-mute" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleOpenDelete(prob)}
                      className="text-xs h-8 px-2 text-rose-600 hover:bg-rose-50"
                      title="Delete problem"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-line space-y-3 bg-canvas/40 -mx-5 -mb-5 p-5">
                    {loadingDetailId === prob.id ? (
                      <div className="text-xs text-mute py-2">Loading specifications...</div>
                    ) : detail ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-semibold text-ink mb-1">Full Statement</p>
                          <p className="text-mute whitespace-pre-line leading-relaxed">{detail.statement}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-ink mb-1">Target Users</p>
                          <p className="text-mute mb-3">{detail.target_users}</p>

                          <p className="font-semibold text-ink mb-1">Constraints</p>
                          <p className="text-mute mb-3">{detail.constraints}</p>

                          <p className="font-semibold text-ink mb-1">Expected Outcome</p>
                          <p className="text-mute mb-3">{detail.expected_outcome}</p>

                          {detail.required_technologies && (
                            <>
                              <p className="font-semibold text-ink mb-1">Suggested Technologies</p>
                              <p className="text-mute mb-3">{detail.required_technologies}</p>
                            </>
                          )}

                          <p className="font-semibold text-ink mb-1">Evaluation Criteria</p>
                          <p className="text-mute">{detail.evaluation_criteria}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-mute">Details could not be loaded.</div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Problem Modal */}
      <Modal
        open={modalOpen}
        title={editingProblemId ? "Edit Problem Statement" : "Add Problem Statement"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {formError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Code *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. AI-01"
                className="w-full rounded-btn border border-line bg-canvas px-3 py-1.5 text-xs text-ink font-mono focus:border-primary focus:outline-none"
              />
              <span className="text-[10px] text-mute">2-20 characters</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink mb-1">Domain *</label>
              <input
                type="text"
                required
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="e.g. FinTech, Healthcare, AI/ML"
                list="domains-list"
                className="w-full rounded-btn border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
              />
              <datalist id="domains-list">
                {hackathon.domains.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Automated Clinical Decision Support System"
              className="w-full rounded-btn border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Short Description *</label>
            <textarea
              required
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief summary visible in catalog cards (min 20 chars)..."
              className="w-full rounded-btn border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Full Statement *</label>
            <textarea
              required
              rows={4}
              value={formData.statement}
              onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
              placeholder="Comprehensive challenge statement and background (min 20 chars)..."
              className="w-full rounded-btn border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Target Users</label>
              <input
                type="text"
                value={formData.target_users}
                onChange={(e) => setFormData({ ...formData, target_users: e.target.value })}
                placeholder="e.g. Clinicians, Patients"
                className="w-full rounded-btn border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Required Technologies</label>
              <input
                type="text"
                value={formData.required_technologies}
                onChange={(e) => setFormData({ ...formData, required_technologies: e.target.value })}
                placeholder="e.g. Python, FastApi, React"
                className="w-full rounded-btn border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Constraints</label>
            <textarea
              rows={2}
              value={formData.constraints}
              onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
              placeholder="System or compliance constraints..."
              className="w-full rounded-btn border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Expected Outcome</label>
            <textarea
              rows={2}
              value={formData.expected_outcome}
              onChange={(e) => setFormData({ ...formData, expected_outcome: e.target.value })}
              placeholder="What the team must deliver (prototype, repo, demo)..."
              className="w-full rounded-btn border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Evaluation Criteria</label>
            <textarea
              rows={2}
              value={formData.evaluation_criteria}
              onChange={(e) => setFormData({ ...formData, evaluation_criteria: e.target.value })}
              placeholder="How submissions will be scored..."
              className="w-full rounded-btn border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="rounded text-primary focus:ring-0"
            />
            <span className="text-xs font-semibold text-ink">Publish immediately to teams</span>
          </label>

          <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingProblemId ? "Save Changes" : "Create Statement"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        title="Delete Problem Statement"
        onClose={() => setDeleteModalOpen(false)}
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              {deleteError}
            </div>
          )}

          <p className="text-xs text-mute">
            Are you sure you want to permanently delete problem{" "}
            <span className="font-bold text-ink">{problemToDelete?.code} - {problemToDelete?.title}</span>?
          </p>

          <p className="text-[11px] text-mute">
            Note: The system rejects deletion if teams have already selected this problem or if it is the last published problem in an active hackathon.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
