import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  Users,
  FolderKanban,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import type { StudentDashboard } from "../types";
import { Button } from "../components/Button";
import { Badge, statusTone } from "../components/Badge";
import { Card, Skeleton } from "../components/States";

export function DashboardAppPage() {
  const { profile, role } = useAuth();

  const [dashboardData, setDashboardData] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const res = await api.get<StudentDashboard>("/dashboard");
      setDashboardData(res.data);
    } catch {
      // Fallback if admin or backend endpoint unavailable
    } finally {
      setLoading(false);
    }
  }

  const displayName = dashboardData?.greeting_name || profile?.full_name || "Builder";
  const displayEmail = profile?.email || "";
  const displayRole = role || profile?.role || "student";

  // Check for overlapping hackathon dates across active squads
  const overlappingPairs: { h1: string; h2: string }[] = [];
  if (dashboardData?.active_teams && dashboardData.active_teams.length > 1) {
    const teams = dashboardData.active_teams;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const t1 = teams[i];
        const t2 = teams[j];
        if (t1.hackathon_id === t2.hackathon_id) continue;
        const s1 = t1.start_date;
        const e1 = t1.end_date || t1.deadline;
        const s2 = t2.start_date;
        const e2 = t2.end_date || t2.deadline;
        if (s1 && e1 && s2 && e2) {
          if (s1 <= e2 && s2 <= e1) {
            overlappingPairs.push({ h1: t1.hackathon_name, h2: t2.hackathon_name });
          }
        }
      }
    }
  }

  return (
    <div className="flex-1 bg-canvas text-ink">
      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8 md:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-ink md:text-3xl">
                Welcome back, {displayName}
              </h1>
              <Badge tone={displayRole === "admin" ? "warning" : "primary"}>
                {displayRole.toUpperCase()}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-mute">
              {displayEmail ? `${displayEmail} · ` : ""}
              {displayRole === "admin"
                ? "HackNova Administrator & Organizer Console."
                : "HackNova student workspace is initialized."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {displayRole === "admin" && (
              <Link to="/app/admin">
                <Button variant="primary" className="text-xs gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Open Admin Console
                </Button>
              </Link>
            )}
            <Link to="/app/hackathons">
              <Button variant="secondary" className="text-xs">
                Explore Hackathons
              </Button>
            </Link>
          </div>
        </div>

        {/* Active Hackathon Panel (if participating) */}
        {loading ? (
          <Skeleton className="mt-8 h-40 w-full rounded-card" />
        ) : dashboardData?.active_teams && dashboardData.active_teams.length > 1 ? (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                Your Active Squads ({dashboardData.active_teams.length})
              </h2>
            </div>

            {overlappingPairs.length > 0 ? (
              <div className="flex items-start gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">Schedule Notice:</span> You are participating in hackathons with overlapping dates (
                  {overlappingPairs.map((p, idx) => (
                    <span key={idx}>
                      {idx > 0 ? ", " : ""}
                      <span className="font-semibold">{p.h1}</span> &amp; <span className="font-semibold">{p.h2}</span>
                    </span>
                  ))}
                  ). Multi-event participation is permitted—ensure you balance deliverables across your squads.
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4">
              {dashboardData.active_teams.map((t) => (
                <Card
                  key={t.team_id || t.hackathon_id}
                  className="overflow-hidden border-primary/30 p-6 bg-gradient-to-r from-primary/5 via-white to-accent-blue/5 shadow-lift"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          <Sparkles className="h-3.5 w-3.5" /> Active Event
                        </span>
                        <Badge tone={statusTone(t.status)}>{t.status.toUpperCase()}</Badge>
                      </div>

                      <h2 className="text-lg md:text-xl font-bold tracking-tight text-ink">
                        {t.hackathon_name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-mute">
                        {t.team_name ? (
                          <span className="flex items-center gap-1.5 font-semibold text-ink">
                            <Users className="h-4 w-4 text-primary" /> Squad: {t.team_name} ({t.member_count} members)
                          </span>
                        ) : null}

                        {t.problem_title ? (
                          <span className="flex items-center gap-1.5 text-ink font-medium">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Challenge: {t.problem_title}
                          </span>
                        ) : null}

                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-amber-600" /> Deadline: {t.deadline}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/app/hackathons/${t.hackathon_id}`}>
                        <Button variant="secondary" className="text-xs">
                          Event
                        </Button>
                      </Link>
                      <Link to={t.team_link || `/app/team?team=${t.team_id}`}>
                        <Button variant="secondary" className="text-xs">
                          Team Hub
                        </Button>
                      </Link>
                      <Link to={t.workspace_link || `/app/workspace?team=${t.team_id}`}>
                        <Button variant="primary" className="text-xs gap-1.5">
                          Workspace <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : dashboardData?.active ? (
          <Card className="mt-8 overflow-hidden border-primary/30 p-6 md:p-8 bg-gradient-to-r from-primary/5 via-white to-accent-blue/5 shadow-lift">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" /> Active Event
                  </span>
                  <Badge tone={statusTone(dashboardData.active.status)}>
                    {dashboardData.active.status.toUpperCase()}
                  </Badge>
                </div>

                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-ink">
                  {dashboardData.active.hackathon_name}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-mute">
                  {dashboardData.active.team_name ? (
                    <span className="flex items-center gap-1.5 font-semibold text-ink">
                      <Users className="h-4 w-4 text-primary" /> Squad: {dashboardData.active.team_name} ({dashboardData.active.member_count} members)
                    </span>
                  ) : null}

                  {dashboardData.active.problem_title ? (
                    <span className="flex items-center gap-1.5 text-ink font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Challenge: {dashboardData.active.problem_title}
                    </span>
                  ) : null}

                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-amber-600" /> Deadline: {dashboardData.active.deadline}
                  </span>
                </div>
              </div>

              <div>
                <Link to={`/app/hackathons/${dashboardData.active.hackathon_id}`}>
                  <Button variant="primary" className="text-xs gap-1.5">
                    View Hackathon & Problems <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Next Action Box */}
        {dashboardData?.next_action ? (
          <div className="mt-6 rounded-card border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Recommended Next Action</p>
              <h3 className="text-base font-bold text-ink mt-1">{dashboardData.next_action.title}</h3>
              <p className="text-xs text-mute mt-1">{dashboardData.next_action.description}</p>
            </div>
            <div>
              <Link to={dashboardData.next_action.href}>
                <Button variant="primary" className="text-xs whitespace-nowrap">
                  {dashboardData.next_action.cta} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : null}

        {/* Quick Access Cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card className="p-6 transition hover:shadow-lift">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-btn bg-primary/10 text-primary">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Hackathons</h3>
                <p className="text-xs text-mute">Discover & apply</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-mute leading-relaxed">
              Browse campus events and find challenges aligned with your tech stack.
            </p>
            <div className="mt-4">
              <Link to="/app/hackathons">
                <Button variant="secondary" className="w-full text-xs">Browse Hackathons</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 transition hover:shadow-lift">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-btn bg-[#20B8E6]/10 text-[#20B8E6]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Squad Formation</h3>
                <p className="text-xs text-mute">Invite & match</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-mute leading-relaxed">
              Create a team or join teammates using peer invite codes and skills matching.
            </p>
            <div className="mt-4">
              <Link to="/app/team">
                <Button variant="secondary" className="w-full text-xs">Manage Team</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 transition hover:shadow-lift">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-btn bg-[#8B5CF6]/10 text-[#8B5CF6]">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Project Workspace</h3>
                <p className="text-xs text-mute">Sprints & submission</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-mute leading-relaxed">
              Coordinate team tasks, milestones, deliverables, and hackathon presentation.
            </p>
            <div className="mt-4">
              <Link to="/app/workspace">
                <Button variant="secondary" className="w-full text-xs">Open Workspace</Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
