import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Check, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { api, apiError } from "../../api/client";
import type { StudentSearchItem, TeamWorkspace } from "../../types";
import { PLATFORM_DOMAINS, AVAILABILITY_OPTIONS } from "../../constants";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Card, EmptyState, Skeleton, ErrorState } from "../../components/States";
import { Input, Select } from "../../components/Field";
import { PageIntro } from "../../components/PageIntro";

const PAGE_SIZE = 12;

export function TeammateSearchPage() {
  const [students, setStudents] = useState<StudentSearchItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [domain, setDomain] = useState("");
  const [availability, setAvailability] = useState("");
  const [page, setPage] = useState(1);

  // Team state for leader invite capability
  const [myTeam, setMyTeam] = useState<TeamWorkspace | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Load user's team info
  useEffect(() => {
    api
      .get<TeamWorkspace | null>("/teams/mine")
      .then((res) => {
        setMyTeam(res.data);
      })
      .catch(() => {});
  }, []);

  const fetchStudents = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (q.trim()) params.append("q", q.trim());
    if (skill.trim()) params.append("skill", skill.trim());
    if (domain) params.append("domain", domain);
    if (availability) params.append("availability", availability);
    params.append("skip", String((page - 1) * PAGE_SIZE));
    params.append("limit", String(PAGE_SIZE));

    api
      .get<StudentSearchItem[]>(`/students?${params.toString()}`)
      .then((res) => {
        setStudents(res.data);
        const countHeader = res.headers["x-total-count"];
        if (countHeader) {
          setTotalCount(parseInt(countHeader, 10) || 0);
        } else {
          setTotalCount(res.data.length);
        }
      })
      .catch((err) => {
        setError(apiError(err, "Failed to load students"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [q, skill, domain, availability, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  }

  function handleResetFilters() {
    setQ("");
    setSkill("");
    setDomain("");
    setAvailability("");
    setPage(1);
  }

  async function handleInvite(student: StudentSearchItem) {
    if (!myTeam?.team.id) return;
    setInvitingId(student.id);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await api.post(`/teams/${myTeam.team.id}/invites`, {
        invitee_id: student.id,
      });
      setInvitedIds((prev) => new Set(prev).add(student.id));
      setInviteSuccess(`Invitation sent to ${student.full_name}!`);
    } catch (err) {
      setInviteError(apiError(err, `Failed to invite ${student.full_name}`));
    } finally {
      setInvitingId(null);
    }
  }

  const isLeader = myTeam?.team.is_leader ?? false;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link to="/app/team">
          <Button variant="secondary" className="gap-1.5 text-xs py-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Team Hub
          </Button>
        </Link>
        {isLeader ? (
          <Badge tone="primary">
            Leading: {myTeam?.team.name} ({myTeam?.team.active_member_count}/{myTeam?.team.team_size_max})
          </Badge>
        ) : null}
      </div>

      <PageIntro
        kicker="Talent Discovery"
        title="Find Teammates"
        body="Search for available students by domain, skill, and schedule to build a well-rounded squad."
      />

      {inviteSuccess ? (
        <div className="flex items-center gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{inviteSuccess}</span>
        </div>
      ) : null}

      {inviteError ? (
        <div className="flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">{inviteError}</div>
        </div>
      ) : null}

      {/* Filter Bar */}
      <Card className="p-4 md:p-5">
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Input
              label="Search by Name"
              placeholder="e.g. Rahul, Aditi..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Input
              label="Skill"
              placeholder="e.g. React, PyTorch, Figma..."
              value={skill}
              onChange={(e) => {
                setSkill(e.target.value);
                setPage(1);
              }}
            />
            <Select
              label="Domain"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Domains</option>
              {PLATFORM_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Select
              label="Availability"
              value={availability}
              onChange={(e) => {
                setAvailability(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Availabilities</option>
              {AVAILABILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-between border-t border-line/60 pt-3">
            <div className="text-xs text-mute font-medium">
              Showing <span className="font-bold text-ink">{students.length}</span> of{" "}
              <span className="font-bold text-ink">{totalCount}</span> available students
            </div>
            <div className="flex items-center gap-2">
              {(q || skill || domain || availability) ? (
                <Button variant="secondary" type="button" onClick={handleResetFilters} className="text-xs py-1.5">
                  Clear Filters
                </Button>
              ) : null}
              <Button variant="primary" type="submit" className="gap-1.5 text-xs py-1.5">
                <Search className="h-3.5 w-3.5" />
                Search
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchStudents} />
      ) : students.length === 0 ? (
        <EmptyState
          title="No teammates found"
          body="No available students match your active filters. Try broadening your search or clearing specific filters."
          action={
            <Button variant="secondary" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => {
            const hasInvited = invitedIds.has(student.id);
            const isInvitingThis = invitingId === student.id;

            return (
              <Card key={student.id} className="p-5 flex flex-col justify-between hover:shadow-lift transition">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-base text-ink truncate">{student.full_name}</h4>
                      <p className="text-xs text-mute truncate">
                        {[student.branch, student.year, student.college].filter(Boolean).join(" • ") || "Student Builder"}
                      </p>
                    </div>
                    {student.availability ? (
                      <span className="capitalize shrink-0">
                        <Badge tone="neutral">{student.availability}</Badge>
                      </span>
                    ) : null}
                  </div>

                  {student.skills.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-semibold text-mute uppercase tracking-wider mb-1.5">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {student.skills.slice(0, 5).map((s) => (
                          <span
                            key={s.skill_id}
                            className="inline-flex items-center rounded-md bg-canvas px-2 py-0.5 text-xs font-medium text-ink border border-line"
                          >
                            {s.name}
                          </span>
                        ))}
                        {student.skills.length > 5 ? (
                          <span className="text-[11px] text-mute font-medium self-center">
                            +{student.skills.length - 5}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {student.preferred_roles.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-semibold text-mute uppercase tracking-wider mb-1">Roles</p>
                      <div className="flex flex-wrap gap-1">
                        {student.preferred_roles.map((r) => (
                          <Badge key={r} tone="primary">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {student.domains.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-semibold text-mute uppercase tracking-wider mb-1">Domains</p>
                      <div className="flex flex-wrap gap-1">
                        {student.domains.map((d) => (
                          <Badge key={d} tone="info">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {isLeader ? (
                  <div className="mt-5 border-t border-line/60 pt-3 flex justify-end">
                    <Button
                      variant={hasInvited ? "secondary" : "primary"}
                      disabled={hasInvited || isInvitingThis || myTeam?.team.is_full}
                      onClick={() => handleInvite(student)}
                      className="gap-1.5 text-xs py-1.5 w-full justify-center"
                    >
                      {hasInvited ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Invited
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          {isInvitingThis ? "Sending..." : "Invite to Team"}
                        </>
                      )}
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-xs py-1.5 px-3 gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-xs font-semibold text-mute px-3">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="text-xs py-1.5 px-3 gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
