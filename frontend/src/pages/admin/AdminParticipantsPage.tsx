import { useState, useEffect, useCallback } from "react";
import { Search, Users, School, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../api/client";
import { Card, EmptyState, ErrorState } from "../../components/States";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import type { AdminParticipant } from "../../types";

export function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<AdminParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [hasTeamFilter, setHasTeamFilter] = useState<"all" | "true" | "false">("all");

  // Pagination
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 15;

  const loadParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        skip: page * limit,
        limit,
      };
      if (search.trim()) params.q = search.trim();
      if (collegeFilter.trim()) params.college = collegeFilter.trim();
      if (hasTeamFilter === "true") params.has_team = true;
      if (hasTeamFilter === "false") params.has_team = false;

      const res = await api.get<AdminParticipant[]>("/admin/participants", { params });
      setParticipants(res.data);
      const total = res.headers["x-total-count"];
      if (total) {
        setTotalCount(parseInt(total, 10));
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load participants");
    } finally {
      setLoading(false);
    }
  }, [page, search, collegeFilter, hasTeamFilter]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  // Reset page on filter changes
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    loadParticipants();
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Participants Directory</h2>
          <p className="text-xs text-mute mt-1">
            Browse registered students across universities, graduation years, and active team placements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info">
            <span className="font-bold mr-1">{totalCount}</span> Registered Participants
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or college..."
              className="w-full pl-9 pr-3 py-1.5 rounded-btn border border-line bg-canvas text-xs text-ink placeholder:text-mute focus:border-primary focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <input
              type="text"
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              placeholder="Filter by college..."
              className="w-full px-3 py-1.5 rounded-btn border border-line bg-canvas text-xs text-ink placeholder:text-mute focus:border-primary focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={hasTeamFilter}
              onChange={(e) => {
                setHasTeamFilter(e.target.value as any);
                setPage(0);
              }}
              className="w-full px-3 py-1.5 rounded-btn border border-line bg-canvas text-xs text-ink focus:border-primary focus:outline-none"
            >
              <option value="all">All Squad Statuses</option>
              <option value="true">Has Squad</option>
              <option value="false">Looking for Squad</option>
            </select>
          </div>

          <div className="sm:col-span-1 flex items-center">
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
          <p className="mt-3 text-xs text-mute">Loading participants...</p>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadParticipants} />
      ) : participants.length === 0 ? (
        <EmptyState
          title="No participants found"
          body="No participants matched your search criteria. Try modifying your search filters."
          action={
            (search || collegeFilter || hasTeamFilter !== "all") ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setCollegeFilter("");
                  setHasTeamFilter("all");
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
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Institution & Academic Info</th>
                    <th className="px-5 py-3">Team / Squad Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white">
                  {participants.map((p) => {
                    const initials = p.full_name
                      ? p.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "U";

                    return (
                      <tr key={p.id} className="hover:bg-canvas/30 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-ink truncate">{p.full_name}</p>
                              <p className="text-[11px] text-mute font-mono truncate">{p.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5">
                            <p className="font-medium text-ink flex items-center gap-1.5 truncate">
                              <School className="h-3.5 w-3.5 text-mute shrink-0" />
                              {p.college || <span className="text-mute italic">Not specified</span>}
                            </p>
                            {(p.branch || p.year) && (
                              <p className="text-[11px] text-mute flex items-center gap-1.5">
                                <GraduationCap className="h-3.5 w-3.5 text-mute shrink-0" />
                                {[p.branch, p.year ? `Year ${p.year}` : null].filter(Boolean).join(" • ")}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          {p.team_name ? (
                            <div className="flex items-center gap-1.5">
                              <Badge tone="success">
                                <Users className="h-3 w-3 mr-1 inline" />
                                {p.team_name}
                              </Badge>
                            </div>
                          ) : (
                            <Badge tone="neutral">No Squad</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-xs text-mute">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, totalCount)} of {totalCount} participants
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
    </div>
  );
}
