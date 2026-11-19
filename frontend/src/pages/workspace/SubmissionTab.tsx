import { useState, useEffect } from "react";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Github,
  Video,
  Presentation,
  Globe,
  Award,
  Clock,
  Sparkles,
  Edit2,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import type { ProjectSubmission, EvaluationOut } from "../../types";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Card, Skeleton } from "../../components/States";
import { Input, TextArea } from "../../components/Field";

interface SubmissionTabProps {
  projectId: string;
  isMember: boolean;
  onProjectUpdated?: () => Promise<void>;
}

export function SubmissionTab({
  projectId,
  isMember,
  onProjectUpdated,
}: SubmissionTabProps) {
  const [submission, setSubmission] = useState<ProjectSubmission | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form edit state
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pitchDeckUrl, setPitchDeckUrl] = useState("");
  const [techStackInput, setTechStackInput] = useState("");
  const [notes, setNotes] = useState("");

  const loadSubmission = async () => {
    try {
      setLoading(true);
      setError(null);
      const [subRes, evalRes] = await Promise.all([
        api.get<ProjectSubmission>(`/projects/${projectId}/submission`),
        api.get<EvaluationOut[]>(`/projects/${projectId}/evaluations`).catch(() => ({ data: [] as EvaluationOut[] })),
      ]);

      const sub = subRes.data;
      setSubmission(sub);
      setEvaluations(evalRes.data || []);

      if (sub) {
        setRepoUrl(sub.repo_url || "");
        setDemoUrl(sub.demo_url || "");
        setVideoUrl(sub.video_url || "");
        setPitchDeckUrl(sub.pitch_deck_url || "");
        setTechStackInput((sub.tech_stack || []).join(", "));
        setNotes(sub.submission_notes || "");
        if (!sub.is_submitted) {
          setIsEditing(true);
        }
      }
    } catch (err) {
      setError(apiError(err, "Failed to load project submission."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmission();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setFormError("Repository URL is required to submit your hackathon project.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const techStackArray = techStackInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await api.post<ProjectSubmission>(`/projects/${projectId}/submit`, {
        repo_url: repoUrl.trim(),
        demo_url: demoUrl.trim() || null,
        video_url: videoUrl.trim() || null,
        pitch_deck_url: pitchDeckUrl.trim() || null,
        tech_stack: techStackArray,
        submission_notes: notes.trim() || null,
      });

      setSubmission(res.data);
      setIsEditing(false);
      setFormSuccess("Project deliverables submitted successfully for judging!");
      if (onProjectUpdated) {
        await onProjectUpdated();
      }
    } catch (err) {
      setFormError(apiError(err, "Failed to submit project."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && !submission) {
    return (
      <Card className="p-6 text-center text-rose-600">
        <AlertCircle className="mx-auto h-8 w-8 mb-2" />
        <p className="text-xs font-semibold">{error}</p>
      </Card>
    );
  }

  const isSubmitted = Boolean(submission?.is_submitted);

  return (
    <div className="space-y-6">
      {/* Top Status Header */}
      <div
        className={`rounded-2xl border p-5 shadow-sm transition-all ${
          isSubmitted
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-primary/20 bg-primary/5"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md ${
                isSubmitted ? "bg-emerald-600 text-white" : "bg-primary text-white"
              }`}
            >
              {isSubmitted ? <CheckCircle2 className="h-6 w-6" /> : <Send className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink">
                  {isSubmitted ? "Project Submitted for Judging" : "Final Project Submission"}
                </h3>
                <Badge tone={isSubmitted ? "success" : "warning"}>
                  {isSubmitted ? "Submitted" : "Draft In Progress"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-mute">
                {isSubmitted
                  ? `Submitted on ${new Date(submission?.submitted_at || "").toLocaleDateString()} by ${
                      submission?.submitted_by_name || "Team Member"
                    }.`
                  : "Submit your final repository, live demo, and video walkthrough before judging begins."}
              </p>
            </div>
          </div>

          {/* Edit toggle for team members */}
          {isMember && isSubmitted && !isEditing && (
            <Button
              variant="secondary"
              onClick={() => setIsEditing(true)}
              className="gap-1.5 text-xs py-1.5 self-start sm:self-auto"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Update Deliverables
            </Button>
          )}
        </div>

        {formSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {formError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
      </div>

      {/* Submitted Deliverables Summary View */}
      {isSubmitted && !isEditing && submission && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-mute border-b border-line pb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Live Project Links
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-line bg-canvas/60">
                <span className="flex items-center gap-2 text-mute font-medium">
                  <Github className="h-4 w-4 text-ink" /> Source Code:
                </span>
                <a
                  href={submission.repo_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary font-bold hover:underline flex items-center gap-1 max-w-[200px] truncate"
                >
                  {submission.repo_url}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>

              {submission.demo_url && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-line bg-canvas/60">
                  <span className="flex items-center gap-2 text-mute font-medium">
                    <Globe className="h-4 w-4 text-emerald-500" /> Live Demo:
                  </span>
                  <a
                    href={submission.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-emerald-600 font-bold hover:underline flex items-center gap-1 max-w-[200px] truncate"
                  >
                    {submission.demo_url}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}

              {submission.video_url && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-line bg-canvas/60">
                  <span className="flex items-center gap-2 text-mute font-medium">
                    <Video className="h-4 w-4 text-purple-500" /> Video Pitch:
                  </span>
                  <a
                    href={submission.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-purple-600 font-bold hover:underline flex items-center gap-1 max-w-[200px] truncate"
                  >
                    {submission.video_url}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}

              {submission.pitch_deck_url && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-line bg-canvas/60">
                  <span className="flex items-center gap-2 text-mute font-medium">
                    <Presentation className="h-4 w-4 text-amber-500" /> Slides:
                  </span>
                  <a
                    href={submission.pitch_deck_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-amber-600 font-bold hover:underline flex items-center gap-1 max-w-[200px] truncate"
                  >
                    {submission.pitch_deck_url}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {submission.tech_stack && submission.tech_stack.length > 0 && (
              <div className="pt-2 border-t border-line/60">
                <span className="text-[11px] font-semibold text-mute uppercase tracking-wider block mb-2">
                  Tech Stack
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {submission.tech_stack.map((t, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-line bg-canvas px-2 py-0.5 text-xs font-medium text-ink"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {submission.submission_notes && (
              <div className="pt-2 border-t border-line/60">
                <span className="text-[11px] font-semibold text-mute uppercase tracking-wider block mb-1">
                  Notes for Judges
                </span>
                <p className="text-xs text-mute whitespace-pre-wrap leading-relaxed">
                  {submission.submission_notes}
                </p>
              </div>
            )}
          </Card>

          {/* Evaluations / Judge Scoring Card */}
          <Card className="p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-mute border-b border-line pb-2 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Judge Evaluation & Scoring
            </h4>

            {evaluations.length === 0 ? (
              <div className="py-8 text-center text-xs text-mute space-y-2">
                <Clock className="mx-auto h-7 w-7 text-mute opacity-50" />
                <p className="font-semibold text-ink">Pending Judging Review</p>
                <p className="max-w-xs mx-auto">
                  Judges are reviewing hackathon submissions. Scores will be computed and visible once reviews are recorded.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {evaluations.map((ev) => (
                  <div key={ev.id} className="rounded-xl border border-line bg-canvas/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink">{ev.judge_name}</span>
                      <div className="flex items-center gap-1.5 font-bold text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                        <span>{ev.total_score}</span>
                        <span className="text-[10px] text-mute font-normal">/ 100</span>
                      </div>
                    </div>

                    {ev.scores && ev.scores.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {ev.scores.map((cs) => (
                          <div key={cs.criterion_id} className="flex items-center justify-between text-xs">
                            <span className="text-mute truncate">
                              {cs.criterion_title} ({cs.criterion_weight}%):
                            </span>
                            <span className="font-mono font-bold text-ink">{cs.score} / 10</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {ev.feedback && (
                      <div className="border-t border-line/60 pt-2 text-xs italic text-mute">
                        "{ev.feedback}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Submission Form (shown when in Draft or editing) */}
      {isEditing && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <h4 className="text-sm font-bold text-ink">
              {isSubmitted ? "Update Submission Details" : "Enter Project Deliverables"}
            </h4>
            <p className="text-xs text-mute leading-relaxed">
              Ensure your repository is publicly accessible or team credentials are shared with judges.
            </p>

            <Input
              label="Repository URL (Required)"
              placeholder="https://github.com/your-org/your-repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Live Demo URL (Optional)"
                placeholder="https://your-app.vercel.app"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
              />

              <Input
                label="Video Walkthrough / Pitch URL (Optional)"
                placeholder="https://loom.com/share/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>

            <Input
              label="Pitch Deck / Presentation Slides URL (Optional)"
              placeholder="https://docs.google.com/presentation/..."
              value={pitchDeckUrl}
              onChange={(e) => setPitchDeckUrl(e.target.value)}
            />

            <Input
              label="Technologies Used (Comma-separated)"
              placeholder="FastAPI, React, Vite, Groq, PostgreSQL"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              hint="Separate each technology with a comma."
            />

            <TextArea
              label="Submission Notes for Judges (Optional)"
              placeholder="Highlight any standout algorithms, architecture decisions, or special test credentials..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex items-center gap-3 pt-3">
              <Button type="submit" variant="primary" loading={submitting}>
                <Send className="h-4 w-4" />
                {isSubmitted ? "Save Deliverable Changes" : "Submit Final Project"}
              </Button>
              {isSubmitted && (
                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
