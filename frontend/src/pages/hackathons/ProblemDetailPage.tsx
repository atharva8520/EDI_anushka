import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
  Target,
  ShieldAlert,
  Award,
  Cpu,
  Sparkles,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import type { ProblemDetail, HackathonDetail, TeamWorkspace } from "../../types";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Card, Skeleton, ErrorState } from "../../components/States";
import { Logo } from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";

export function ProblemDetailPage() {
  const { id: hackathonId, problemId } = useParams<{ id: string; problemId: string }>();
  const { logout, role, profile } = useAuth();

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [myTeam, setMyTeam] = useState<TeamWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection mutation states
  const [selecting, setSelecting] = useState(false);
  const [selectSuccess, setSelectSuccess] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  useEffect(() => {
    if (problemId && hackathonId) {
      loadData(hackathonId, problemId);
    }
  }, [hackathonId, problemId]);

  async function loadData(hId: string, pId: string) {
    setLoading(true);
    setError(null);
    try {
      const [pRes, hRes, teamRes] = await Promise.all([
        api.get<ProblemDetail>(`/problems/${pId}`),
        api.get<HackathonDetail>(`/hackathons/${hId}`),
        api.get<TeamWorkspace | null>("/teams/mine").catch(() => ({ data: null })),
      ]);

      setProblem(pRes.data);
      setHackathon(hRes.data);
      setMyTeam(teamRes.data);
    } catch (err) {
      setError(apiError(err, "Failed to load problem statement."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectProblem() {
    if (!myTeam || !problem) return;
    setSelecting(true);
    setSelectError(null);
    setSelectSuccess(null);

    try {
      await api.post(`/teams/${myTeam.team.id}/problem`, {
        problem_id: problem.id,
      });

      setSelectSuccess("Problem statement successfully selected for your team!");

      // Refresh team data to update selected_problem
      const updatedTeam = await api.get<TeamWorkspace | null>("/teams/mine");
      setMyTeam(updatedTeam.data);
    } catch (err) {
      setSelectError(apiError(err, "Failed to select this problem. Only the team leader can select a problem."));
    } finally {
      setSelecting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-48 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !problem || !hackathon) {
    return (
      <div className="min-h-screen bg-canvas p-8 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorState message={error || "Problem statement not found"} onRetry={() => hackathonId && problemId && loadData(hackathonId, problemId)} />
          <div className="mt-4 text-center">
            <Link to={`/app/hackathons/${hackathonId}`}>
              <Button variant="secondary" className="text-xs">
                Back to Hackathon
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check team and leader eligibility
  const isInThisHackathon = myTeam?.team.hackathon_id === hackathon.id;
  const isTeamLeader = isInThisHackathon && (myTeam?.team.is_leader || myTeam?.team.leader_id === profile?.id);
  const isCurrentlySelected = isInThisHackathon && myTeam?.team.selected_problem?.id === problem.id;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/80 px-6 py-3.5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/app">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-4 text-sm font-medium text-mute sm:flex">
              <Link to="/app" className="hover:text-ink">
                Overview
              </Link>
              <Link to="/app/hackathons" className="text-primary font-semibold">
                Hackathons
              </Link>
              <Link to="/app/team" className="hover:text-ink">
                Team
              </Link>
              <Link to="/app/workspace" className="hover:text-ink">
                Workspace
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-mute sm:inline">
              {profile?.full_name} ({role})
            </span>
            <Button variant="secondary" onClick={() => logout()} className="text-xs">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Breadcrumb Links */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-mute">
          <Link to="/app/hackathons" className="hover:text-ink">
            Hackathons
          </Link>
          <span>/</span>
          <Link to={`/app/hackathons/${hackathon.id}`} className="hover:text-ink truncate max-w-[200px]">
            {hackathon.name}
          </Link>
          <span>/</span>
          <span className="text-primary font-mono">{problem.code}</span>
        </div>

        {/* Title Header Card */}
        <Card className="p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="rounded bg-primary/10 px-2.5 py-1 text-xs font-mono font-bold text-primary">
              {problem.code}
            </span>
            <Badge tone="primary">{problem.domain}</Badge>
            {isCurrentlySelected ? (
              <Badge tone="success">Selected by your team ({myTeam?.team.name})</Badge>
            ) : null}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
            {problem.title}
          </h1>

          {/* Statement Highlight Box */}
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-1">
              Core Challenge Statement
            </span>
            <p className="text-sm md:text-base font-semibold text-ink leading-relaxed">
              "{problem.statement}"
            </p>
          </div>
        </Card>

        {/* Team Leader Selection Box */}
        <div className="mt-6">
          {selectSuccess ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {selectSuccess}
            </div>
          ) : null}

          {selectError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {selectError}
            </div>
          ) : null}

          {isTeamLeader ? (
            <Card className="p-6 border-primary/30 shadow-lift">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <Sparkles className="h-4 w-4" /> Team Leader Actions
                  </div>
                  <p className="mt-1 text-xs text-mute">
                    As leader of <strong>{myTeam?.team.name}</strong>, you can lock this problem statement for your sprint.
                  </p>
                </div>

                <div>
                  {isCurrentlySelected ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-btn px-4 py-2.5">
                      <CheckCircle2 className="h-4 w-4" /> Active Challenge
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleSelectProblem}
                      loading={selecting}
                      className="text-xs"
                    >
                      Select this problem
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : isInThisHackathon ? (
            <Card className="p-5 text-xs text-mute flex items-center justify-between">
              <div>
                <span>You are on team <strong>{myTeam?.team.name}</strong>. Only your team leader (<strong>{myTeam?.team.leader_name}</strong>) can select a problem.</span>
              </div>
              {isCurrentlySelected ? (
                <Badge tone="success">Selected by your squad</Badge>
              ) : null}
            </Card>
          ) : (
            <Card className="p-5 text-xs text-mute flex items-center justify-between">
              <span>You do not belong to a team in this hackathon yet.</span>
              <Link to={`/app/team?hackathon=${hackathon.id}`}>
                <Button variant="secondary" className="text-xs">
                  Create a team
                </Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Detailed Breakdown Sections */}
        <div className="mt-6 space-y-6">
          {/* Detailed Description */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-ink mb-2">Detailed Scope</h3>
            <p className="text-xs text-mute leading-relaxed whitespace-pre-line">
              {problem.description}
            </p>
          </Card>

          {/* Target Users & Constraints Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Target className="h-4 w-4" />
                <h3 className="text-sm font-bold text-ink">Target Users</h3>
              </div>
              <p className="text-xs text-mute leading-relaxed">{problem.target_users}</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2 text-amber-600">
                <ShieldAlert className="h-4 w-4" />
                <h3 className="text-sm font-bold text-ink">Constraints & Assumptions</h3>
              </div>
              <p className="text-xs text-mute leading-relaxed">{problem.constraints}</p>
            </Card>
          </div>

          {/* Expected Outcome & Evaluation Criteria */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2 text-accent-blue">
                <Sparkles className="h-4 w-4" />
                <h3 className="text-sm font-bold text-ink">Expected Deliverables</h3>
              </div>
              <p className="text-xs text-mute leading-relaxed">{problem.expected_outcome}</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2 text-accent-violet">
                <Award className="h-4 w-4" />
                <h3 className="text-sm font-bold text-ink">Evaluation Criteria</h3>
              </div>
              <p className="text-xs text-mute leading-relaxed">{problem.evaluation_criteria}</p>
            </Card>
          </div>

          {/* Required Technologies */}
          {problem.required_technologies ? (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Cpu className="h-4 w-4" />
                <h3 className="text-sm font-bold text-ink">Recommended Tech Stack & Tools</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {problem.required_technologies.split(",").map((tech) => (
                  <span
                    key={tech.trim()}
                    className="rounded-lg bg-canvas border border-line px-3 py-1 text-xs font-semibold text-ink"
                  >
                    {tech.trim()}
                  </span>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </main>
    </div>
  );
}
