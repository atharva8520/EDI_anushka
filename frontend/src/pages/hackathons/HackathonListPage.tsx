import { useState, useEffect, useTransition } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Users,
  MapPin,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  ShieldCheck,
  Edit2,
  FileCode,
  Building2,
  Trophy,
  Clock,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import type { HackathonListItem } from "../../types";
import { Button } from "../../components/Button";
import { Badge, statusTone } from "../../components/Badge";
import { Card, Skeleton, EmptyState, ErrorState } from "../../components/States";
import { useAuth } from "../../context/AuthContext";
import { PLATFORM_DOMAINS } from "../../constants";

const DOMAIN_OPTIONS = ["All", ...PLATFORM_DOMAINS];

export function HackathonListPage() {
  const { role } = useAuth();
  const [, startTransition] = useTransition();

  const [hackathons, setHackathons] = useState<HackathonListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("start_date");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        setDebouncedQuery(searchQuery);
        setPage(1);
      });
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchHackathons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, selectedDomain, selectedStatus, sortBy, sortOrder, page]);

  async function fetchHackathons() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
        sort_by: sortBy,
        order: sortOrder,
      };

      if (debouncedQuery.trim()) {
        params.q = debouncedQuery.trim();
      }
      if (selectedDomain !== "All") {
        params.domain = selectedDomain;
      }
      if (selectedStatus !== "all") {
        params.status = selectedStatus;
      }

      const res = await api.get<HackathonListItem[]>("/hackathons", { params });
      setHackathons(res.data);

      const headerTotal = res.headers["x-total-count"];
      if (headerTotal !== undefined) {
        setTotalCount(parseInt(headerTotal, 10));
      } else {
        setTotalCount(res.data.length);
      }
    } catch (err) {
      setError(apiError(err, "Failed to load hackathons."));
    } finally {
      setLoading(false);
    }
  }

  function handleResetFilters() {
    setSearchQuery("");
    setDebouncedQuery("");
    setSelectedDomain("All");
    setSelectedStatus("all");
    setSortBy("start_date");
    setSortOrder("desc");
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex-1 bg-canvas text-ink">
      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Intro */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Discover Events</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Hackathons & Challenges</h1>
            <p className="mt-2 text-sm text-mute md:text-base">
              Explore active hackathons, examine official problem statements, and form your squad.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/app/host">
              <Button variant="primary" className="text-xs gap-1.5 py-2 bg-gradient-to-r from-cyan to-indigo-600 shadow-glow">
                <Plus className="h-4 w-4" /> Host Hackathon
              </Button>
            </Link>
            {role === "admin" && (
              <Link to="/app/admin/hackathons">
                <Button variant="secondary" className="text-xs gap-1.5 py-2">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  Admin Console
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mb-6 rounded-card border border-line bg-surface-card/90 p-4 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
              <input
                type="text"
                placeholder="Search by event name, company / organizer, domain, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-[12px] border border-line bg-canvas pl-10 pr-4 py-2 text-sm outline-none transition focus:border-cyan focus:bg-surface-elevated text-slate-100"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-mute font-medium">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters:</span>
              </div>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="rounded-[10px] border border-line bg-canvas px-3 py-1.5 text-xs font-medium outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="published">Upcoming / Published</option>
                <option value="completed">Completed</option>
                {role === "admin" ? <option value="draft">Drafts (Admin)</option> : null}
              </select>

              {/* Domain */}
              <select
                value={selectedDomain}
                onChange={(e) => {
                  setSelectedDomain(e.target.value);
                  setPage(1);
                }}
                className="rounded-[10px] border border-line bg-canvas px-3 py-1.5 text-xs font-medium outline-none"
              >
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d === "All" ? "All Domains" : d}
                  </option>
                ))}
              </select>

              {/* Sort By */}
              <div className="flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3 text-mute" />
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-[10px] border border-line bg-canvas px-3 py-1.5 text-xs font-medium outline-none"
                >
                  <option value="start_date">Start Date</option>
                  <option value="registration_deadline">Registration Deadline</option>
                  <option value="name">Alphabetical</option>
                  <option value="created_at">Date Added</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="rounded-[10px] border border-line bg-surface-card px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan hover:border-cyan/40"
                  title="Toggle Asc/Desc"
                >
                  {sortOrder === "asc" ? "ASC" : "DESC"}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Domain Filter Pills */}
          <div className="mt-3.5 pt-3 border-t border-line/60 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-mute mr-1">Categories:</span>
            {DOMAIN_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setSelectedDomain(d);
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  selectedDomain === d
                    ? "bg-gradient-to-r from-primary to-cyan text-white shadow-glow"
                    : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60"
                }`}
              >
                {d === "All" ? "All Tracks" : d}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-card border border-line bg-surface-card/90 p-6 shadow-card space-y-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchHackathons} />
        ) : hackathons.length === 0 ? (
          <EmptyState
            title="No hackathons match your search"
            body="Try broadening your search query or selecting a different status/domain filter."
            action={
              <Button variant="secondary" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between text-xs text-mute">
              <span>
                Showing {hackathons.length} of {totalCount} hackathons
              </span>
              <span>
                Page {page} of {totalPages}
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {hackathons.map((h) => {
                const isDeadlinePassed = new Date() > new Date(h.registration_deadline);
                return (
                  <Card key={h.id} className="flex flex-col justify-between p-6 transition-all duration-300 glass-panel-hover border-line hover:border-cyan/40 bg-surface-card/90">
                    <div>
                      {/* Top Meta */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge tone={statusTone(h.status)}>{h.status.toUpperCase()}</Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-mute font-semibold truncate max-w-[160px]">
                          <Building2 className="h-3 w-3 text-primary shrink-0" />
                          {h.organizer}
                        </span>
                      </div>

                      {/* Title & Short description */}
                      <Link to={`/app/hackathons/${h.id}`}>
                        <h2 className="text-base font-bold tracking-tight text-ink hover:text-primary transition line-clamp-1">
                          {h.name}
                        </h2>
                      </Link>
                      <p className="mt-1.5 text-xs text-mute leading-relaxed line-clamp-2">
                        {h.short_description}
                      </p>

                      {/* Domains */}
                      <div className="mt-3.5 flex flex-wrap gap-1.5">
                        {h.domains.map((d) => (
                          <span
                            key={d}
                            className="inline-block rounded-md bg-slate-800/80 px-2 py-0.5 text-[11px] font-semibold text-slate-300 border border-slate-700/60"
                          >
                            {d}
                          </span>
                        ))}
                      </div>

                      {/* Key dates & Stats */}
                      <div className="mt-4 space-y-2 border-t border-line/70 pt-3.5 text-xs text-mute">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            Reg Deadline:
                          </span>
                          <strong className="text-ink">{h.registration_deadline}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-accent-blue" />
                            Location:
                          </span>
                          <span className="font-semibold text-ink">{h.location}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-accent-violet" />
                            Squad Size:
                          </span>
                          <span>{h.team_size_min}–{h.team_size_max} builders</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA & Counters */}
                    <div className="mt-5 border-t border-line/70 pt-3.5">
                      <div className="flex items-center justify-between mb-3 text-xs">
                        <span className="font-bold text-primary flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5 text-amber-500" />
                          {h.problem_count} {h.problem_count === 1 ? "Problem Track" : "Problem Tracks"}
                        </span>
                        <span className="text-mute font-medium">
                          {h.team_count} {h.team_count === 1 ? "Active Squad" : "Active Squads"}
                        </span>
                      </div>

                      {isDeadlinePassed ? (
                        <div className="mb-2 text-[11px] font-semibold text-amber-300 bg-amber-950/40 rounded-lg px-2 py-1 text-center border border-amber-500/30">
                          Registration Closed
                        </div>
                      ) : null}

                      {role === "admin" ? (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <Link to={`/app/admin/hackathons/${h.id}/edit`} className="block">
                            <Button variant="secondary" className="w-full text-xs py-1.5 gap-1">
                              <Edit2 className="h-3 w-3 text-mute" /> Edit
                            </Button>
                          </Link>
                          <Link to={`/app/admin/hackathons/${h.id}/problems`} className="block">
                            <Button variant="secondary" className="w-full text-xs py-1.5 gap-1">
                              <FileCode className="h-3 w-3 text-mute" /> Problems
                            </Button>
                          </Link>
                        </div>
                      ) : null}

                      <Link to={`/app/hackathons/${h.id}`} className="block">
                        <Button variant="primary" className="w-full text-xs py-2 shadow-sm">
                          Explore Challenge &amp; Form Squad
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 ? (
              <div className="mt-10 flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="text-xs gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-xs font-semibold text-mute">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="text-xs gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
