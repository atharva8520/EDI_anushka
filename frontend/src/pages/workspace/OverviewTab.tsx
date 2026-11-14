import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Github,
  ExternalLink,
  Edit2,
  Check,
  X,
  Users,
  Clock,
  CheckCircle2,
  ListTodo,
  FileText,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import type { Project, ProjectSummary, Member, HackathonDetail, SkillGapResponse } from "../../types";
import { Card, Skeleton } from "../../components/States";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";

interface OverviewTabProps {
  project: Project;
  summary: ProjectSummary | null;
  members: Member[];
  hackathonId: string;
  isLeader: boolean;
  isMember: boolean;
  onProjectUpdated: () => Promise<void>;
}

export function OverviewTab({
  project,
  summary,
  members,
  hackathonId,
  isLeader,
  isMember,
  onProjectUpdated,
}: OverviewTabProps) {
  // Hackathon end date & countdown
  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [hackathonLoading, setHackathonLoading] = useState(false);

  // Skill Gap Analysis state
  const [skillGap, setSkillGap] = useState<SkillGapResponse | null>(null);
  const [skillGapLoading, setSkillGapLoading] = useState(false);
  const [skillGapError, setSkillGapError] = useState<string | null>(null);

  // Edit project info
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(project.title);
  const [editSummary, setEditSummary] = useState(project.summary || "");
  const [editRepoUrl, setEditRepoUrl] = useState(project.repo_url || "");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Sync state if project prop updates
  useEffect(() => {
    setEditTitle(project.title);
    setEditSummary(project.summary || "");
    setEditRepoUrl(project.repo_url || "");
  }, [project]);

  // Fetch hackathon details for end_date countdown
  useEffect(() => {
    if (!hackathonId) return;
    let mounted = true;
    setHackathonLoading(true);

    api
      .get<HackathonDetail>(`/hackathons/${hackathonId}`)
      .then((res) => {
        if (mounted) {
          setHackathon(res.data);
        }
      })
      .catch(() => {
        // Failed fetch handled gracefully
      })
      .finally(() => {
        if (mounted) {
          setHackathonLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [hackathonId]);

  // Fetch skill-gap analysis for squad
  useEffect(() => {
    if (!project.team_id) return;
    let mounted = true;
    setSkillGapLoading(true);
    setSkillGapError(null);

    api
      .get<SkillGapResponse>(`/ai/teams/${project.team_id}/skill-gap`)
      .then((res) => {
        if (mounted) {
          setSkillGap(res.data);
        }
      })
      .catch((err) => {
        if (mounted) {
          // If 400 with no problem selected, we gracefully keep skillGap as null
          if (err?.response?.status === 400) {
            setSkillGap(null);
          } else {
            setSkillGapError(apiError(err, "Failed to load skill-gap analysis"));
          }
        }
      })
      .finally(() => {
        if (mounted) {
          setSkillGapLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [project.team_id]);

  // Calculate countdown label
  function getCountdownLabel(): string {
    if (!hackathon || !hackathon.end_date) return "";
    try {
      const end = new Date(hackathon.end_date.includes("T") ? hackathon.end_date : `${hackathon.end_date}T23:59:59`);
      const now = new Date();
      const diffMs = end.getTime() - now.getTime();

      if (diffMs <= 0) {
        return "Hackathon has ended";
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        return `Hackathon ends in ${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"}`;
      }
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `Hackathon ends in ${hours} hour${hours === 1 ? "" : "s"}, ${minutes} minute${minutes === 1 ? "" : "s"}`;
    } catch {
      return "";
    }
  }

  const countdown = getCountdownLabel();

  async function handleSave() {
    try {
      setSaving(true);
      setActionError(null);
      setActionSuccess(null);

      const payload: Record<string, any> = {
        summary: editSummary.trim() || null,
        repo_url: editRepoUrl.trim() || "",
      };

      if (isLeader) {
        payload.title = editTitle.trim();
      }

      await api.patch(`/projects/${project.id}`, payload);
      setActionSuccess("Project overview updated successfully");
      setEditing(false);
      await onProjectUpdated();
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditTitle(project.title);
    setEditSummary(project.summary || "");
    setEditRepoUrl(project.repo_url || "");
    setEditing(false);
    setActionError(null);
  }

  const isClickableRepo =
    Boolean(project.repo_url) &&
    (project.repo_url!.startsWith("http://") || project.repo_url!.startsWith("https://"));

  return (
    <div className="space-y-6">
      {/* Inline Feedback Alerts */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#991B1B]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-xs font-semibold text-[#166534]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Countdown Card (if hackathon has end date) */}
      {hackathonLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : countdown ? (
        <Card className="flex items-center justify-between border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-mute">Hackathon Timeline</p>
              <p className="text-sm font-bold text-ink">{countdown}</p>
            </div>
          </div>
          {hackathon?.end_date && (
            <Badge tone="info">Deadline: {hackathon.end_date}</Badge>
          )}
        </Card>
      ) : null}

      {/* Main Overview Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Project Details & Repository */}
        <div className="space-y-6 lg:col-span-2">
          {/* Project Details Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                  Project Workspace
                </span>
                <h2 className="text-lg font-bold text-ink">{project.title}</h2>
              </div>
              {isMember && !editing && (
                <Button variant="secondary" className="!py-1.5 !px-3 !text-xs" onClick={() => setEditing(true)}>
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Overview
                </Button>
              )}
            </div>

            {editing ? (
              <div className="mt-4 space-y-4">
                {isLeader ? (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink">Project Title (Leader Only)</label>
                    <input
                      className="w-full rounded-[12px] border border-line bg-white px-3.5 py-2 text-xs text-ink outline-none transition focus:border-primary"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Enter project title"
                      maxLength={200}
                    />
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-semibold text-mute">Title: </span>
                    <span className="text-xs font-bold text-ink">{project.title}</span>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">Project Summary</label>
                  <textarea
                    className="w-full rounded-[12px] border border-line bg-white px-3.5 py-2 text-xs text-ink outline-none transition focus:border-primary min-h-[90px]"
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    placeholder="Describe your solution architecture, tech stack, and goals..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">
                    GitHub Repository URL
                  </label>
                  <input
                    className="w-full rounded-[12px] border border-line bg-white px-3.5 py-2 text-xs text-ink outline-none transition focus:border-primary"
                    value={editRepoUrl}
                    onChange={(e) => setEditRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                  />
                  <p className="mt-1 text-[11px] text-mute">
                    Must start with https://github.com/owner/repo (or leave empty to clear).
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="ghost" className="!py-1.5 !px-3 !text-xs" onClick={handleCancel} disabled={saving}>
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button variant="primary" className="!py-1.5 !px-3 !text-xs" onClick={handleSave} disabled={saving}>
                    <Check className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <span className="text-xs font-semibold text-mute">Summary</span>
                  <p className="mt-1 text-xs text-ink leading-relaxed whitespace-pre-wrap">
                    {project.summary || "No project summary provided yet. Click 'Edit Overview' to add one."}
                  </p>
                </div>

                {/* GitHub Repository Info */}
                <div className="rounded-xl border border-line bg-canvas/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-white">
                        <Github className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                          Source Code Repository
                        </span>
                        <div className="mt-0.5">
                          {project.repo_url ? (
                            isClickableRepo ? (
                              <a
                                href={project.repo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                              >
                                {project.repo_url}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-xs font-medium text-ink">{project.repo_url}</span>
                            )
                          ) : (
                            <span className="text-xs italic text-mute">
                              No repository linked yet.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {project.repo_url && isClickableRepo && (
                      <a
                        href={project.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-btn border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition hover:bg-canvas"
                      >
                        Open GitHub
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Quick Execution Progress Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Checklist Deliverables Card */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                  Submission Checklist
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#0284C7]">
                  <ListTodo className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ink">
                  {summary ? `${summary.checklist_percent}%` : "0%"}
                </span>
                <span className="text-xs text-mute">
                  ({summary?.checklist_done || 0}/{summary?.checklist_total || 0} completed)
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#EEF0F6]">
                <div
                  className="h-full rounded-full bg-[#0284C7] transition-all duration-500"
                  style={{ width: `${summary?.checklist_percent || 0}%` }}
                />
              </div>
            </Card>

            {/* Technical Notes Summary Card */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                  Technical Notes
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#D97706]">
                  <FileText className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ink">{summary?.notes_count || 0}</span>
                <span className="text-xs text-mute">notes documented</span>
              </div>
              <p className="mt-3 text-[11px] text-mute">
                Use the Notes tab to document architecture, APIs, and guides.
              </p>
            </Card>
          </div>

          {/* Problem Skill Gap Analysis Card */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm text-ink">Problem Skill Gap Analysis</h3>
              </div>
              {skillGap?.problem_code ? (
                <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {skillGap.problem_code}
                </span>
              ) : null}
            </div>

            {skillGapLoading ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : skillGapError ? (
              <div className="rounded-[12px] bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                {skillGapError}
              </div>
            ) : !skillGap ? (
              <div className="rounded-[12px] border border-dashed border-line p-4 text-center space-y-2">
                <p className="text-xs text-mute">
                  No official problem statement selected for this squad yet.
                </p>
                <Link to="/app/teams" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  Go to Squad Management to select a problem
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-ink">{skillGap.problem_title}</h4>
                  <p className="text-[11px] text-mute mt-0.5">
                    Required technologies evaluated against current squad members' capabilities:
                  </p>
                </div>

                {/* Summary badges */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-800 border border-emerald-200">
                    ✓ {skillGap.summary.covered} Covered
                  </span>
                  <span className="rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-800 border border-amber-200">
                    ⚠ {skillGap.summary.partial} Partial
                  </span>
                  <span className="rounded-md bg-rose-50 px-2 py-1 font-semibold text-rose-800 border border-rose-200">
                    ✕ {skillGap.summary.missing} Missing
                  </span>
                  {skillGap.summary.unclassified > 0 ? (
                    <span className="rounded-md bg-slate-50 px-2 py-1 font-medium text-slate-700 border border-slate-200">
                      ℹ {skillGap.summary.unclassified} General Requirements
                    </span>
                  ) : null}
                </div>

                {/* Detailed Pills */}
                <div className="space-y-2 pt-1 border-t border-line/60">
                  {skillGap.covered.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-emerald-800 mr-1">Covered:</span>
                      {skillGap.covered.map((it, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-medium"
                        >
                          {it.name || it.term} ({it.category || "Skill"})
                        </span>
                      ))}
                    </div>
                  )}

                  {skillGap.partial.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-amber-800 mr-1">Partial:</span>
                      {skillGap.partial.map((it, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-[11px] font-medium"
                        >
                          {it.name || it.term} ({it.category || "Skill"} - Beginner)
                        </span>
                      ))}
                    </div>
                  )}

                  {skillGap.missing.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-rose-800 mr-1">Missing:</span>
                      {skillGap.missing.map((it, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-rose-100 text-rose-900 px-2.5 py-0.5 text-[11px] font-medium"
                        >
                          {it.name || it.term} ({it.category || "Unmet"})
                        </span>
                      ))}
                    </div>
                  )}

                  {skillGap.unclassified.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 mr-1">Other:</span>
                      {skillGap.unclassified.map((tok, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-[11px] font-medium"
                        >
                          {tok}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {(skillGap.missing.length > 0 || skillGap.partial.length > 0) && (
                  <div className="rounded-[10px] bg-primary/5 border border-primary/20 p-3 text-xs flex items-center justify-between gap-3">
                    <p className="text-ink">
                      Looking to fill these skill gaps? Check smart teammate suggestions.
                    </p>
                    <Link
                      to="/app/teams"
                      className="shrink-0 flex items-center gap-1 font-bold text-primary hover:underline"
                    >
                      View Suggestions
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (1 col): Team Members */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Team Members ({members.length})
                </h3>
              </div>
            </div>

            <div className="mt-4 divide-y divide-line">
              {members.length === 0 ? (
                <p className="py-3 text-xs italic text-mute">No active members found.</p>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {(m.full_name || "M").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-ink">{m.full_name || "Member"}</p>
                        <p className="text-[11px] text-mute">{m.member_role || "Member"}</p>
                      </div>
                    </div>
                    {m.user_id === project.created_by && (
                      <Badge tone="primary">Creator</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
