import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  FileCode,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
} from "lucide-react";
import { api } from "../../api/client";
import { Card, EmptyState } from "../../components/States";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { ALLOWED_STATUS_TRANSITIONS } from "../../constants";
import type { HackathonListItem, HackathonStatus } from "../../types";

export function AdminHackathonsPage() {
  const [hackathons, setHackathons] = useState<HackathonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Status transition modal state
  const [selectedHackathon, setSelectedHackathon] = useState<HackathonListItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<HackathonStatus | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [transitionSuccess, setTransitionSuccess] = useState<string | null>(null);

  const loadHackathons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        skip: page * limit,
        limit,
      };
      if (search.trim()) params.q = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await api.get<HackathonListItem[]>("/hackathons", { params });
      setHackathons(res.data);
      const total = res.headers["x-total-count"];
      if (total) setTotalCount(parseInt(total, 10));
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load hackathons");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadHackathons();
  }, [loadHackathons]);

  function openStatusModal(h: HackathonListItem, nextStatus: HackathonStatus) {
    setSelectedHackathon(h);
    setTargetStatus(nextStatus);
    setTransitionError(null);
    setTransitionSuccess(null);
  }

  async function handleConfirmStatusChange() {
    if (!selectedHackathon || !targetStatus) return;
    setTransitioning(true);
    setTransitionError(null);
    try {
      await api.post(`/hackathons/${selectedHackathon.id}/status`, {
        status: targetStatus,
      });
      setTransitionSuccess(`Successfully updated status to ${targetStatus}`);
      setTimeout(() => {
        setSelectedHackathon(null);
        setTargetStatus(null);
        setTransitionSuccess(null);
        loadHackathons();
      }, 1200);
    } catch (err: any) {
      setTransitionError(err.response?.data?.detail || "Failed to update hackathon status");
    } finally {
      setTransitioning(false);
    }
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Hackathons Supervision</h2>
          <p className="text-xs text-mute">View, edit, and transition lifecycle statuses for organizer challenges.</p>
        </div>
        <Link to="/app/admin/hackathons/new">
          <Button variant="primary" className="text-xs gap-1.5 py-2">
            <Plus className="h-4 w-4" />
            Create Hackathon
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-mute" />
            <input
              type="text"
              placeholder="Search hackathons by name or domain..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-mute shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="w-full sm:w-44 py-2 px-3 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Table or Cards */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : hackathons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-mute uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-bold">Hackathon</th>
                  <th className="py-3 px-4 font-bold">Timeline</th>
                  <th className="py-3 px-4 font-bold">Team Limits</th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                  <th className="py-3 px-4 font-bold">Allowed Status Actions</th>
                  <th className="py-3 px-4 font-bold text-right">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {hackathons.map((h) => {
                  const allowedNext = ALLOWED_STATUS_TRANSITIONS[h.status] || [];
                  return (
                    <tr key={h.id} className="hover:bg-canvas/40 transition">
                      <td className="py-4 px-4 font-semibold text-ink">
                        <div>
                          <p className="font-bold text-sm text-ink">{h.name}</p>
                          <p className="text-[11px] text-mute line-clamp-1">{h.short_description}</p>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-mute">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="h-3.5 w-3.5 text-mute" />
                          <span>{h.start_date} to {h.end_date}</span>
                        </div>
                        <p className="text-[10px] text-mute/80 mt-0.5">Reg by: {h.registration_deadline}</p>
                      </td>

                      <td className="py-4 px-4 text-mute">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Users className="h-3.5 w-3.5 text-mute" />
                          <span>{h.team_size_min} - {h.team_size_max} members</span>
                        </div>
                        <p className="text-[10px] text-mute mt-0.5">{h.team_count} squads formed</p>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <Badge
                          tone={
                            h.status === "active"
                              ? "success"
                              : h.status === "published"
                              ? "primary"
                              : h.status === "draft"
                              ? "neutral"
                              : "warning"
                          }
                        >
                          {h.status.toUpperCase()}
                        </Badge>
                      </td>

                      {/* Status Actions (only allowed next transitions) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {allowedNext.length > 0 ? (
                            allowedNext.map((nextSt) => (
                              <button
                                key={nextSt}
                                onClick={() => openStatusModal(h, nextSt as HackathonStatus)}
                                className="inline-flex items-center gap-1 rounded-full border border-line bg-white hover:bg-canvas px-2.5 py-1 text-[11px] font-bold text-ink transition shadow-2xs hover:border-primary/50"
                              >
                                &rarr; {nextSt}
                              </button>
                            ))
                          ) : (
                            <span className="text-[11px] text-mute italic">No transitions</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/app/admin/hackathons/${h.id}/problems`}>
                            <Button variant="secondary" className="text-[11px] py-1 px-2.5 gap-1">
                              <FileCode className="h-3.5 w-3.5 text-purple-600" />
                              Problems ({h.problem_count})
                            </Button>
                          </Link>
                          <Link to={`/app/admin/hackathons/${h.id}/edit`}>
                            <Button variant="secondary" className="text-[11px] py-1 px-2.5 gap-1">
                              <Edit2 className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              title="No Hackathons Found"
              body="No hackathons match the current filter or search criteria."
            />
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > limit && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 bg-white">
            <span className="text-xs text-mute">
              Showing page {page + 1} of {totalPages} ({totalCount} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                className="text-xs py-1 px-3"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs py-1 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Confirmation Modal for Status Transitions */}
      {selectedHackathon && targetStatus && (
        <Modal
          open={true}
          onClose={() => {
            if (!transitioning) {
              setSelectedHackathon(null);
              setTargetStatus(null);
            }
          }}
          title={`Transition Hackathon Status`}
        >
          <div className="space-y-4">
            <p className="text-xs text-mute leading-relaxed">
              Are you sure you want to transition{" "}
              <span className="font-bold text-ink">{selectedHackathon.name}</span> from{" "}
              <span className="font-bold uppercase text-mute">{selectedHackathon.status}</span> to{" "}
              <span className="font-bold uppercase text-primary">{targetStatus}</span>?
            </p>

            {targetStatus === "active" && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                <span className="font-bold">Prerequisite Check:</span> Activating requires at least one published problem statement and criteria weights totalling 100.
              </div>
            )}

            {targetStatus === "published" && (
              <div className="rounded-xl bg-slate-50 border border-line p-3 text-xs text-mute">
                <span className="font-bold text-ink">Prerequisite Check:</span> Publishing requires judging criteria weights totalling 100.
              </div>
            )}

            {transitionError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{transitionError}</span>
              </div>
            )}

            {transitionSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{transitionSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <Button
                variant="secondary"
                disabled={transitioning}
                onClick={() => {
                  setSelectedHackathon(null);
                  setTargetStatus(null);
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={transitioning || !!transitionSuccess}
                onClick={handleConfirmStatusChange}
                className="text-xs gap-1.5"
              >
                {transitioning ? "Transitioning..." : `Confirm Transition to ${targetStatus}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
