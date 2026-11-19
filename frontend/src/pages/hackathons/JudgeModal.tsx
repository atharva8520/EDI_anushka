import { useState, useEffect } from "react";
import {
  Award,
  X,
  ExternalLink,
  Github,
  Globe,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import type { HackathonDetail, ProjectSubmission, EvaluationOut } from "../../types";
import { Button } from "../../components/Button";
import { TextArea } from "../../components/Field";

interface JudgeModalProps {
  hackathon: HackathonDetail;
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function JudgeModal({
  hackathon,
  open,
  onClose,
  onSaved,
}: JudgeModalProps) {
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadSubmissions();
    }
  }, [open, hackathon.id]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ProjectSubmission[]>(`/hackathons/${hackathon.id}/submissions`);
      setSubmissions(res.data);
      if (res.data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(res.data[0].id);
      }
    } catch (err) {
      setError(apiError(err, "Failed to load hackathon submissions."));
    } finally {
      setLoading(false);
    }
  };

  // Initialize or reset scores when selected project changes
  useEffect(() => {
    if (hackathon.criteria.length > 0) {
      const initial: Record<string, number> = {};
      hackathon.criteria.forEach((c) => {
        initial[c.id || c.title] = 8.0;
      });
      setScores(initial);
      setFeedback("");
      setSaveSuccess(null);
      setSaveError(null);
    }
  }, [selectedProjectId, hackathon.criteria]);

  if (!open) return null;

  const selectedProj = submissions.find((s) => s.id === selectedProjectId);

  // Compute live weighted score preview
  const totalWeight = hackathon.criteria.reduce((acc, c) => acc + c.weight, 0);
  const weightedSum = hackathon.criteria.reduce((acc, c) => {
    const val = scores[c.id || c.title] ?? 8.0;
    return acc + val * c.weight;
  }, 0);
  const previewTotal = totalWeight > 0 ? ((weightedSum / totalWeight) * 10).toFixed(1) : "0.0";

  const handleScoreChange = (criterionId: string, value: number) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: Math.min(10, Math.max(1, value)),
    }));
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const scoresPayload = hackathon.criteria.map((c) => ({
      criterion_id: c.id,
      score: scores[c.id || c.title] ?? 8.0,
    }));

    try {
      await api.post<EvaluationOut>(`/projects/${selectedProjectId}/evaluations`, {
        feedback: feedback.trim() || null,
        scores: scoresPayload,
      });

      setSaveSuccess("Evaluation saved successfully! Leaderboard updated.");
      await onSaved();
    } catch (err) {
      setSaveError(apiError(err, "Failed to record evaluation."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-surface-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-mute hover:text-ink"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/10 text-accent-violet">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink">Judge & Score Submissions</h3>
            <p className="text-xs text-mute">
              Official evaluation rubric for {hackathon.name}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-mute">Loading submissions...</div>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {error}
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-12 text-center text-xs text-mute">
            <p className="font-semibold text-ink">No submitted projects found</p>
            <p className="mt-1">Teams must submit their final repository before judging.</p>
          </div>
        ) : (
          <form onSubmit={handleSaveEvaluation} className="mt-5 space-y-5">
            {/* Project Selector */}
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                Select Team & Project to Score
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas p-2.5 text-xs text-ink outline-none focus:border-primary"
              >
                {submissions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.team_name} — {sub.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Project Links Preview */}
            {selectedProj && (
              <div className="rounded-xl border border-line bg-canvas/40 p-3.5 space-y-2 text-xs">
                <div className="font-bold text-ink">{selectedProj.title}</div>
                {selectedProj.summary && <p className="text-mute line-clamp-2">{selectedProj.summary}</p>}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {selectedProj.repo_url && (
                    <a
                      href={selectedProj.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      <Github className="h-3.5 w-3.5" /> Source Code <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {selectedProj.demo_url && (
                    <a
                      href={selectedProj.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" /> Live Demo <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Criteria Sliders / Inputs */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="text-xs font-bold text-ink uppercase tracking-wider">
                  Evaluation Criteria Scoring
                </span>
                <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-accent-violet/10 text-accent-violet">
                  Total Score: {previewTotal} / 100
                </span>
              </div>

              {hackathon.criteria.map((c) => {
                const key = c.id || c.title;
                const scoreVal = scores[key] ?? 8.0;

                return (
                  <div key={key} className="rounded-xl border border-line p-3.5 bg-surface-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-ink">{c.title}</span>
                        <span className="ml-2 text-[11px] text-mute font-mono">Weight: {c.weight}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-sm text-primary">{scoreVal.toFixed(1)}</span>
                        <span className="text-[11px] text-mute">/ 10</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-mute">{c.description}</p>
                    <input
                      type="range"
                      min="1.0"
                      max="10.0"
                      step="0.5"
                      value={scoreVal}
                      onChange={(e) => handleScoreChange(key, parseFloat(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>

            {/* Qualitative Feedback */}
            <TextArea
              label="Judge Feedback / Comments (Optional)"
              placeholder="Constructive feedback for the squad on technical architecture, demo execution, and UI polish..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />

            {/* Feedback notifications */}
            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {saveError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button type="submit" variant="primary" loading={saving} className="gap-1.5">
                <Save className="h-4 w-4" />
                Save Score & Evaluation
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
