import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  ShieldAlert,
  Award,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  FileText,
  ShieldCheck,
  Edit2,
  FileCode,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import type { HackathonDetail, ProblemSummary, TeamWorkspace } from "../../types";
import { Button } from "../../components/Button";
import { Badge, statusTone } from "../../components/Badge";
import { Card, Skeleton, ErrorState } from "../../components/States";
import { useAuth } from "../../context/AuthContext";

export function HackathonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [myTeam, setMyTeam] = useState<TeamWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  async function loadData(hackathonId: string) {
    setLoading(true);
    setError(null);
    try {
      const [hRes, pRes, teamRes] = await Promise.all([
        api.get<HackathonDetail>(`/hackathons/${hackathonId}`),
        api.get<ProblemSummary[]>(`/hackathons/${hackathonId}/problems`),
        api.get<TeamWorkspace | null>("/teams/mine").catch(() => ({ data: null })),
      ]);

      setHackathon(hRes.data);
      setProblems(pRes.data);
      setMyTeam(teamRes.data);
    } catch (err) {
      setError(apiError(err, "Failed to load hackathon details."));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full rounded-card" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-40 col-span-2 rounded-card" />
            <Skeleton className="h-40 rounded-card" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="min-h-screen bg-canvas p-8 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorState message={error || "Hackathon not found"} onRetry={() => id && loadData(id)} />
          <div className="mt-4 text-center">
            <Link to="/app/hackathons">
              <Button variant="secondary" className="text-xs">
                Back to Hackathons
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasTeamInThisHackathon = myTeam?.team.hackathon_id === hackathon.id;
  const isDeadlinePassed = new Date() > new Date(hackathon.registration_deadline);
  const isCompleted = hackathon.status === "completed";

  return (
    <div className="flex-1 bg-canvas text-ink">
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Back Link */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/app/hackathons"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-mute hover:text-ink transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Hackathons
          </Link>

          {role === "admin" && (
            <div className="flex items-center gap-2">
              <Link to={`/app/admin/hackathons/${hackathon.id}/edit`}>
                <Button variant="secondary" className="text-xs py-1.5 h-8 gap-1.5">
                  <Edit2 className="h-3.5 w-3.5 text-mute" /> Edit Hackathon
                </Button>
              </Link>
              <Link to={`/app/admin/hackathons/${hackathon.id}/problems`}>
                <Button variant="secondary" className="text-xs py-1.5 h-8 gap-1.5">
                  <FileCode className="h-3.5 w-3.5 text-mute" /> Manage Problems
                </Button>
              </Link>
              <Link to="/app/admin/hackathons">
                <Button variant="primary" className="text-xs py-1.5 h-8 gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Admin Console
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Hero Card */}
        <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          {hackathon.banner_url ? (
            <div className="h-48 md:h-64 w-full overflow-hidden relative">
              <img
                src={hackathon.banner_url}
                alt={hackathon.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          ) : null}

          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge tone={statusTone(hackathon.status)}>{hackathon.status.toUpperCase()}</Badge>
              <span className="text-xs text-mute font-semibold">Organized by {hackathon.organizer}</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-ink">
              {hackathon.name}
            </h1>
            <p className="mt-3 text-sm md:text-base text-mute max-w-3xl leading-relaxed">
              {hackathon.description}
            </p>

            {/* Domains */}
            <div className="mt-5 flex flex-wrap gap-2">
              {hackathon.domains.map((d) => (
                <span
                  key={d}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Meta Grid */}
            <div className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2 md:grid-cols-4 text-xs">
              <div className="rounded-xl bg-canvas p-3 border border-line">
                <span className="flex items-center gap-1.5 text-mute font-medium">
                  <Calendar className="h-4 w-4 text-primary" /> Event Dates
                </span>
                <p className="mt-1 font-bold text-ink">
                  {hackathon.start_date} – {hackathon.end_date}
                </p>
              </div>

              <div className="rounded-xl bg-canvas p-3 border border-line">
                <span className="flex items-center gap-1.5 text-mute font-medium">
                  <Calendar className="h-4 w-4 text-amber-600" /> Registration Deadline
                </span>
                <p className="mt-1 font-bold text-ink">{hackathon.registration_deadline}</p>
              </div>

              <div className="rounded-xl bg-canvas p-3 border border-line">
                <span className="flex items-center gap-1.5 text-mute font-medium">
                  <MapPin className="h-4 w-4 text-accent-blue" /> Location
                </span>
                <p className="mt-1 font-bold text-ink">{hackathon.location}</p>
              </div>

              <div className="rounded-xl bg-canvas p-3 border border-line">
                <span className="flex items-center gap-1.5 text-mute font-medium">
                  <Users className="h-4 w-4 text-accent-violet" /> Squad Limits
                </span>
                <p className="mt-1 font-bold text-ink">
                  {hackathon.team_size_min} to {hackathon.team_size_max} builders
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Bar */}
        <div className="mt-6 rounded-card border border-primary/20 bg-gradient-to-r from-primary/5 via-accent-blue/5 to-white p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              {hasTeamInThisHackathon ? (
                <>
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5" /> Registered with team "{myTeam?.team.name}"
                  </div>
                  <p className="mt-1 text-xs text-mute">
                    You and your teammates are participating in this hackathon.
                  </p>
                </>
              ) : isCompleted || isDeadlinePassed ? (
                <>
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                    <AlertCircle className="h-5 w-5" /> Registration is closed for this hackathon
                  </div>
                  <p className="mt-1 text-xs text-mute">
                    The registration window ended on {hackathon.registration_deadline}.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-ink">Ready to compete?</h3>
                  <p className="mt-1 text-xs text-mute">
                    Create a team, invite your peers, and pick an official challenge statement.
                  </p>
                </>
              )}
            </div>

            <div>
              {hasTeamInThisHackathon ? (
                <Link to="/app/team">
                  <Button variant="primary" className="text-xs">
                    Go to my team <ArrowLeft className="h-4 w-4 rotate-180" />
                  </Button>
                </Link>
              ) : !isDeadlinePassed && !isCompleted ? (
                <Link to={`/app/team?hackathon=${hackathon.id}`}>
                  <Button variant="primary" className="text-xs">
                    Create a team
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" disabled className="text-xs">
                  Registration Closed
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Grid: Problems List (Left) and Judging/Rules (Right) */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Problems (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-ink">Problem Statements</h2>
                <p className="text-xs text-mute">
                  Review the challenges released by organizers and select one for your squad.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary">
                {problems.length} {problems.length === 1 ? "Problem" : "Problems"}
              </span>
            </div>

            {problems.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-mute mb-2" />
                <p className="text-sm font-bold">No problem statements released yet</p>
                <p className="text-xs text-mute mt-1">Check back closer to the hackathon start date.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {problems.map((p) => {
                  const isSelectedByMyTeam =
                    hasTeamInThisHackathon && myTeam?.team.selected_problem?.id === p.id;

                  return (
                    <Card
                      key={p.id}
                      className={`p-6 transition hover:shadow-lift ${
                        isSelectedByMyTeam ? "border-emerald-500 bg-emerald-50/20" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-bold text-primary">
                              {p.code}
                            </span>
                            <span className="text-xs font-semibold text-mute">{p.domain}</span>
                            {isSelectedByMyTeam ? (
                              <Badge tone="success">Selected by your team</Badge>
                            ) : null}
                          </div>

                          <h3 className="text-base font-bold text-ink">{p.title}</h3>
                          <p className="mt-2 text-xs text-mute leading-relaxed line-clamp-3">
                            {p.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-line pt-3 flex items-center justify-between">
                        <span className="text-xs text-mute">
                          {isSelectedByMyTeam ? "Your team is solving this problem" : "Open challenge"}
                        </span>
                        <Link to={`/app/hackathons/${hackathon.id}/problems/${p.id}`}>
                          <Button variant="secondary" className="text-xs">
                            View Problem & Evaluation &rarr;
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Rules */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-ink">Rules & Guidelines</h3>
              </div>
              <p className="text-xs text-mute leading-relaxed whitespace-pre-line">
                {hackathon.rules}
              </p>
            </Card>
          </div>

          {/* Judging Criteria & Organizer Info (1 Col) */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-accent-violet" />
                <h3 className="text-base font-bold text-ink">Judging Criteria</h3>
              </div>

              <div className="space-y-4">
                {hackathon.criteria.map((c) => (
                  <div key={c.title} className="rounded-xl border border-line bg-canvas p-3.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-ink">{c.title}</span>
                      <span className="rounded bg-accent-violet/10 px-2 py-0.5 text-accent-violet font-mono">
                        {c.weight}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-mute">{c.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 text-center">
              <FolderKanban className="mx-auto h-8 w-8 text-primary mb-2" />
              <h4 className="text-sm font-bold">Team Formation Assistance</h4>
              <p className="mt-1 text-xs text-mute">
                Need teammates with AI/ML or UI/UX skills? Form or join squads with tailored role matching.
              </p>
              <div className="mt-4">
                <Link to="/app/team">
                  <Button variant="secondary" className="w-full text-xs">
                    Explore Teams
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
