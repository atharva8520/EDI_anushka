import { useState, useEffect, useCallback } from "react";
import {
  Users2,
  Search,
  Eye,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Crown,
  FileCode,
} from "lucide-react";
import { api } from "../../api/client";
import { Card, EmptyState, ErrorState } from "../../components/States";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import type {
  AdminTeamListItem,
  AdminTeamDetail,
  HackathonListItem,
} from "../../types";

export function AdminTeamsPage() {
  const [teams, setTeams] = useState<AdminTeamListItem[]>([]);
  const [hackathons, setHackathons] = useState<HackathonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedHackathonId, setSelectedHackathonId] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 15;

  // Team detail drawer / modal state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamDetail, setTeamDetail] = useState<AdminTeamDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Load hackathons for dropdown filter
  useEffect(() => {
    async function fetchHackathons() {
      try {
        const res = await api.get<HackathonListItem[]>("/hackathons", { params: { limit: 100 } });
        setHackathons(res.data);
      } catch {
        // Ignored, dropdown simply empty or fallback
      }
    }
    fetchHackathons();
  }, []);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        skip: page * limit,
        limit,
      };
      if (search.trim()) params.q = search.trim();
      if (selectedHackathonId !== "all") params.hackathon_id = selectedHackathonId;

      const res = await api.get<AdminTeamListItem[]>("/admin/teams", { params });
      setTeams(res.data);
      const total = res.headers["x-total-count"];
      if (total) {
        setTotalCount(parseInt(total, 10));
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedHackathonId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Open read-only team detail
  async function handleOpenDetail(teamId: string) {
    setSelectedTeamId(teamId);
    setTeamDetail(null);
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await api.get<AdminTeamDetail>(`/admin/teams/${teamId}`);
      setTeamDetail(res.data);
    } catch (err: any) {
      setDetailError(err.response?.data?.detail || "Failed to load team details");
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    loadTeams();
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Squads & Teams Directory</h2>
          <p className="text-xs text-mute mt-1">
            Supervise team rosters, problem statements, and workspace deliverables. Read-only audit access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="primary">
            <span className="font-bold mr-1">{totalCount}</span> Total Teams
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by team name, leader, or hackathon..."
              className="w-full pl-9 pr-3 py-1.5 rounded-btn border border-line bg-canvas text-xs text-ink placeholder:text-mute focus:border-primary focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedHackathonId}
              onChange={(e) => {
                setSelectedHackathonId(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-1.5 rounded-btn border border-line bg-canvas text-xs text-ink focus:border-primary focus:outline-none"
            >
              <option value="all">All Hackathons</option>
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center">
            <Button type="submit" variant="secondary" className="w-full text-xs h-8 px-2 flex justify-center items-center">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-line border-t-primary" />
          <p className="mt-3 text-xs text-mute">Loading teams...</p>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadTeams} />
      ) : teams.length === 0 ? (
        <EmptyState
          title="No teams found"
          body="No teams match your current search and filter settings."
          action={
            (search || selectedHackathonId !== "all") ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setSelectedHackathonId("all");
                  setPage(0);
                }}
              >
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden border border-line">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-canvas/60 text-mute uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Team Name & Hackathon</th>
                    <th className="px-5 py-3">Leader</th>
                    <th className="px-5 py-3">Size & Readiness</th>
                    <th className="px-5 py-3">Selected Problem</th>
                    <th className="px-5 py-3">Workspace Progress</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white">
                  {teams.map((t) => (
                    <tr key={t.id} className="hover:bg-canvas/30 transition">
                      <td className="px-5 py-3.5">
                        <div className="min-w-0">
                          <p className="font-bold text-ink truncate">{t.name}</p>
                          <p className="text-[11px] text-mute truncate">{t.hackathon_name}</p>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-ink font-medium">
                          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{t.leader_name}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">
                            {t.member_count}/{t.team_size_max}
                          </span>
                          <Badge tone={t.is_ready ? "success" : "warning"}>
                            {t.is_ready ? "Ready" : "Forming"}
                          </Badge>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {t.selected_problem_title ? (
                          <p className="text-ink font-medium truncate max-w-xs" title={t.selected_problem_title}>
                            {t.selected_problem_title}
                          </p>
                        ) : (
                          <span className="text-mute italic text-[11px]">None selected</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {t.has_project ? (
                          <div className="space-y-1 max-w-[120px]">
                            <div className="flex items-center justify-between text-[10px] text-mute">
                              <span>{t.percent_complete}%</span>
                              <span>{t.tasks_completed}/{t.tasks_total} tasks</span>
                            </div>
                            <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, t.percent_complete)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-mute text-[11px] italic">No workspace</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          onClick={() => handleOpenDetail(t.id)}
                          className="text-xs h-8 px-2.5 inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5 text-mute" />
                          <span>Inspect</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-xs text-mute">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, totalCount)} of {totalCount} teams
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-xs h-8 px-2.5 flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <span className="text-xs font-semibold text-ink px-2">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-xs h-8 px-2.5 flex items-center gap-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Read-Only Team Detail Modal */}
      <Modal
        open={Boolean(selectedTeamId)}
        title={teamDetail ? teamDetail.name : "Team Details"}
        onClose={() => setSelectedTeamId(null)}
      >
        {loadingDetail ? (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="h-7 w-7 animate-spin rounded-full border-3 border-line border-t-primary" />
            <p className="mt-2 text-xs text-mute">Fetching team records...</p>
          </div>
        ) : detailError ? (
          <div className="p-4 text-xs text-rose-800 font-semibold bg-rose-50 rounded-lg">
            {detailError}
          </div>
        ) : teamDetail ? (
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* Meta header */}
            <div className="rounded-lg bg-canvas p-3 border border-line text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-mute">Hackathon:</span>
                <span className="font-semibold text-ink">{teamDetail.hackathon_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mute">Team Leader:</span>
                <span className="font-semibold text-ink flex items-center gap-1">
                  <Crown className="h-3 w-3 text-amber-500 inline" /> {teamDetail.leader_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mute">Formed Date:</span>
                <span className="font-mono text-ink">
                  {new Date(teamDetail.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Active Members - Note: Absolutely no emails per spec! */}
            <div>
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users2 className="h-3.5 w-3.5 text-primary" />
                Active Members ({teamDetail.members.length})
              </h4>
              <div className="space-y-2">
                {teamDetail.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-line bg-white text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{m.name}</span>
                        {m.is_leader && (
                          <span className="rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-bold">
                            Leader
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-mute">{m.college || "No college specified"}</p>
                    </div>

                    <div className="text-right">
                      <span className="inline-block text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {m.member_role}
                      </span>
                      <p className="text-[10px] text-mute mt-0.5">
                        Joined {new Date(m.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Problem */}
            <div>
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-primary" />
                Track Problem Statement
              </h4>
              {teamDetail.selected_problem ? (
                <div className="rounded-lg border border-line p-3 bg-white text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-canvas border border-line">
                      {teamDetail.selected_problem.code}
                    </span>
                    <Badge tone="info">{teamDetail.selected_problem.domain}</Badge>
                  </div>
                  <p className="font-bold text-ink pt-1">{teamDetail.selected_problem.title}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-line p-3 text-center text-xs text-mute">
                  No problem statement has been locked in by this team yet.
                </div>
              )}
            </div>

            {/* Project & Workspace Deliverables */}
            <div>
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                Workspace Execution & Progress
              </h4>
              {teamDetail.project_summary ? (
                <div className="space-y-3 rounded-lg border border-line p-3 bg-white text-xs">
                  {/* Task counts */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded bg-canvas border border-line">
                      <p className="text-[10px] text-mute">Todo</p>
                      <p className="text-sm font-bold text-ink">{teamDetail.project_summary.task_counts.todo}</p>
                    </div>
                    <div className="p-2 rounded bg-blue-50 border border-blue-200">
                      <p className="text-[10px] text-blue-700">In Progress</p>
                      <p className="text-sm font-bold text-blue-900">{teamDetail.project_summary.task_counts.in_progress}</p>
                    </div>
                    <div className="p-2 rounded bg-amber-50 border border-amber-200">
                      <p className="text-[10px] text-amber-700">Review</p>
                      <p className="text-sm font-bold text-amber-900">{teamDetail.project_summary.task_counts.review}</p>
                    </div>
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                      <p className="text-[10px] text-emerald-700">Done</p>
                      <p className="text-sm font-bold text-emerald-900">{teamDetail.project_summary.task_counts.completed}</p>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-2 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-mute">Kanban Task Completion</span>
                        <span className="font-bold text-ink">{teamDetail.project_summary.percent_complete}%</span>
                      </div>
                      <div className="h-2 w-full bg-line rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${teamDetail.project_summary.percent_complete}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-mute">Submission Checklist Progress</span>
                        <span className="font-bold text-ink">{teamDetail.project_summary.checklist_percent}%</span>
                      </div>
                      <div className="h-2 w-full bg-line rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${teamDetail.project_summary.checklist_percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-line p-3 text-center text-xs text-mute">
                  No project workspace initialized yet.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-line flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedTeamId(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
