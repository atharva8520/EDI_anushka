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
  Building2,
  Layers,
  Flame,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import type { StudentDashboard, HackathonListItem } from "../types";
import { Button } from "../components/Button";
import { Badge, statusTone } from "../components/Badge";
import { Card, Skeleton } from "../components/States";

export function DashboardAppPage() {
  const { profile, role } = useAuth();

  const [dashboardData, setDashboardData] = useState<StudentDashboard | null>(null);
  const [recentHackathons, setRecentHackathons] = useState<HackathonListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [dashRes, hackRes] = await Promise.all([
        api.get<StudentDashboard>("/dashboard").catch(() => null),
        api
          .get<HackathonListItem[]>("/hackathons?skip=0&limit=6&sort_by=start_date&order=desc")
          .catch(() => null),
      ]);
      if (dashRes?.data) setDashboardData(dashRes.data);
      if (hackRes?.data && Array.isArray(hackRes.data)) {
        setRecentHackathons(hackRes.data);
      }
    } catch {
      // Fallback
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
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 md:py-10 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-ink md:text-3xl">
                Welcome back, {displayName}
              </h1>
              <Badge tone={displayRole === "admin" ? "warning" : "primary"}>
                {displayRole.toUpperCase()}
              </Badge>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-mute">
              {displayEmail ? `${displayEmail} · ` : ""}
              {displayRole === "admin"
                ? "HackNova Administrator & Organizer Console."
                : "Your hackathon workspace, registered squads, and live challenges."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {displayRole === "admin" && (
              <Link to="/app/admin">
                <Button variant="primary" className="text-xs gap-1.5 py-2">
                  <ShieldCheck className="h-4 w-4" /> Admin Console
                </Button>
              </Link>
            )}
            <Link to="/app/host">
              <Button variant="primary" className="text-xs gap-1.5 py-2 bg-gradient-to-r from-cyan to-indigo-600">
                <Sparkles className="h-4 w-4" /> Host Hackathon
              </Button>
            </Link>
            <Link to="/app/hackathons">
              <Button variant="secondary" className="text-xs py-2">
                Explore Directory
              </Button>
            </Link>
          </div>
        </div>

        {/* Active Hackathon Panel (if participating) */}
        {loading ? (
          <Skeleton className="h-40 w-full rounded-card" />
        ) : dashboardData?.active_teams && dashboardData.active_teams.length > 1 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-cyan flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-400" /> Your Active Squads ({dashboardData.active_teams.length})
              </h2>
            </div>

            {overlappingPairs.length > 0 ? (
              <div className="flex items-start gap-2.5 rounded-[12px] border border-amber-500/30 bg-amber-950/40 p-4 text-xs font-medium text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <span className="font-bold">Schedule Notice:</span> You are participating in hackathons with overlapping dates (
                  {overlappingPairs.map((p, idx) => (
                    <span key={idx}>
                      {idx > 0 ? ", " : ""}
                      <span className="font-semibold text-white">{p.h1}</span> &amp; <span className="font-semibold text-white">{p.h2}</span>
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
                  className="overflow-hidden border-primary/30 p-6 bg-surface-card/90 hover:border-cyan/40 shadow-glow transition-all"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-xs font-semibold text-cyan">
                          <Sparkles className="h-3.5 w-3.5" /> Active Event
                        </span>
                        <Badge tone={statusTone(t.status)}>{t.status.toUpperCase()}</Badge>
                      </div>

                      <h2 className="text-lg md:text-xl font-bold tracking-tight text-ink">
                        {t.hackathon_name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-mute">
                        {t.team_name ? (
                          <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                            <Users className="h-4 w-4 text-cyan" /> Squad: {t.team_name} ({t.member_count} members)
                          </span>
                        ) : null}

                        {t.problem_title ? (
                          <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Challenge: {t.problem_title}
                          </span>
                        ) : null}

                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-amber-400" /> Deadline: {t.deadline}
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
          <Card className="overflow-hidden border-primary/30 p-6 md:p-8 bg-surface-card/90 hover:border-cyan/40 shadow-glow">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-xs font-semibold text-cyan">
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
                    <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <Users className="h-4 w-4 text-cyan" /> Squad: {dashboardData.active.team_name} ({dashboardData.active.member_count} members)
                    </span>
                  ) : null}

                  {dashboardData.active.problem_title ? (
                    <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Challenge: {dashboardData.active.problem_title}
                    </span>
                  ) : null}

                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-amber-400" /> Deadline: {dashboardData.active.deadline}
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
          <div className="rounded-card border border-primary/30 bg-primary/10 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cyan">Recommended Next Action</p>
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

        {/* Live & Newly Hosted Hackathons on Dashboard */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <Compass className="h-5 w-5 text-cyan" /> Explore Active &amp; Hosted Hackathons
              </h2>
              <p className="text-xs text-mute">
                Discover live events, company-sponsored challenges, and newly created hackathons.
              </p>
            </div>
            <Link to="/app/hackathons" className="text-xs font-semibold text-cyan hover:underline flex items-center gap-1">
              View All ({recentHackathons.length}) <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentHackathons.map((h) => {
              const isUserOrg =
                profile?.full_name &&
                h.organizer.toLowerCase().includes(profile.full_name.toLowerCase());

              return (
                <Card
                  key={h.id}
                  className="flex flex-col justify-between p-5 glass-panel-hover border-line hover:border-cyan/40 bg-surface-card/90"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge tone={statusTone(h.status)}>{h.status.toUpperCase()}</Badge>
                        {isUserOrg && (
                          <span className="rounded-full bg-cyan/15 text-cyan border border-cyan/30 px-2 py-0.5 text-[10px] font-bold">
                            Your Event
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-mute font-medium flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-primary" /> {h.organizer}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-ink line-clamp-1">{h.name}</h3>
                    <p className="text-xs text-mute line-clamp-2 leading-relaxed">
                      {h.short_description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {h.domains.map((dom) => (
                        <span
                          key={dom}
                          className="rounded-md bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[10px] font-semibold text-slate-300"
                        >
                          {dom}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-line/60 flex items-center justify-between">
                    <div className="text-[11px] text-mute space-y-0.5">
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-amber-400" /> Ends {h.end_date}
                      </p>
                      <p className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-cyan" /> {h.problem_count} Problem Tracks
                      </p>
                    </div>

                    <Link to={`/app/hackathons/${h.id}`}>
                      <Button variant="secondary" className="text-xs py-1.5 px-3">
                        View Event
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Organizer Host CTA Banner */}
        <div className="rounded-card border border-cyan/30 bg-gradient-to-r from-primary/15 via-surface-card to-cyan/10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-glow">
          <div className="space-y-1.5 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan/10 border border-cyan/30 px-3 py-0.5 text-xs font-bold text-cyan">
              <Building2 className="h-3.5 w-3.5" /> For Companies &amp; Organizers
            </span>
            <h3 className="text-lg md:text-xl font-bold text-ink">
              Want to Host Your Own Hackathon?
            </h3>
            <p className="text-xs text-mute leading-relaxed">
              Create an event in 5 steps with automatic challenge statement generation, domain rubrics, and direct access to top engineering teams.
            </p>
          </div>
          <Link to="/app/host">
            <Button variant="primary" className="text-xs whitespace-nowrap gap-1.5 py-3 px-6 shadow-glow">
              <Sparkles className="h-4 w-4" /> Launch Hackathon Wizard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Quick Access Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 transition-all hover:border-primary/40 hover:shadow-glow">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-btn bg-primary/20 text-primary border border-primary/30">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-ink">Hackathons</h3>
                <p className="text-xs text-mute">Discover &amp; apply</p>
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

          <Card className="p-6 transition-all hover:border-cyan/40 hover:shadow-glow">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-btn bg-cyan/20 text-cyan border border-cyan/30">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-ink">Squad Formation</h3>
                <p className="text-xs text-mute">Invite &amp; match</p>
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

          <Card className="p-6 transition-all hover:border-violet-500/40 hover:shadow-glow">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-btn bg-violet-500/20 text-violet-400 border border-violet-500/30">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-ink">Project Workspace</h3>
                <p className="text-xs text-mute">Sprints &amp; submission</p>
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
