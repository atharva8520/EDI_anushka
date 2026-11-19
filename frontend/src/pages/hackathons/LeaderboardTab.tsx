import { useState, useEffect } from "react";
import {
  Award,
  Github,
  Globe,
  Trophy,
  Medal,
  Users,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import type { HackathonDetail, LeaderboardItem } from "../../types";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Card, EmptyState, Skeleton, ErrorState } from "../../components/States";
import { JudgeModal } from "./JudgeModal";

interface LeaderboardTabProps {
  hackathon: HackathonDetail;
  isAdmin: boolean;
}

export function LeaderboardTab({ hackathon, isAdmin }: LeaderboardTabProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [judgeModalOpen, setJudgeModalOpen] = useState(false);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<LeaderboardItem[]>(`/hackathons/${hackathon.id}/leaderboard`);
      setLeaderboard(res.data);
    } catch (err) {
      setError(apiError(err, "Failed to load leaderboard."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [hackathon.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadLeaderboard} />;
  }

  const top3 = leaderboard.slice(0, 3);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: <Trophy className="h-5 w-5 text-amber-500" />,
          color: "border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400",
          title: "1st Place (Gold)",
        };
      case 2:
        return {
          icon: <Medal className="h-5 w-5 text-slate-400" />,
          color: "border-slate-400 bg-slate-500/10 text-slate-600 dark:text-slate-300",
          title: "2nd Place (Silver)",
        };
      case 3:
        return {
          icon: <Medal className="h-5 w-5 text-amber-700" />,
          color: "border-amber-700/40 bg-amber-700/10 text-amber-700 dark:text-amber-500",
          title: "3rd Place (Bronze)",
        };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Judge Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Hackathon Leaderboard & Rankings
          </h2>
          <p className="text-xs text-mute">
            Live rankings computed from weighted criteria judge evaluations.
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => setJudgeModalOpen(true)}
            className="gap-1.5 text-xs py-1.5"
          >
            <Award className="h-4 w-4" />
            Judge Submissions
          </Button>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <EmptyState
          title="No evaluations recorded yet"
          body="Teams are currently building or awaiting judging reviews. Once judges record criteria scores, rankings will appear here."
          action={
            isAdmin ? (
              <Button variant="primary" onClick={() => setJudgeModalOpen(true)}>
                Score First Project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((item) => {
              const badgeStyle = getRankBadge(item.rank);

              return (
                <Card
                  key={item.project_id}
                  className={`p-5 relative flex flex-col justify-between border-2 transition-all hover:shadow-lg ${
                    item.rank === 1
                      ? "border-amber-400/80 bg-gradient-to-b from-amber-500/10 via-surface-card to-canvas"
                      : item.rank === 2
                      ? "border-slate-400/80 bg-gradient-to-b from-slate-400/10 via-surface-card to-canvas"
                      : "border-amber-700/60 bg-gradient-to-b from-amber-700/10 via-surface-card to-canvas"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeStyle?.color}`}>
                        {badgeStyle?.icon}
                        {badgeStyle?.title}
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-base text-ink">
                          {item.average_score.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-mute block">/ 100 pts</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-ink truncate">{item.project_title}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-mute mt-0.5">
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-medium text-ink">{item.team_name}</span>
                      </div>
                    </div>

                    {item.problem_title && (
                      <div className="text-[11px] text-mute line-clamp-1">
                        Challenge: <span className="font-medium text-ink">{item.problem_title}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-line/60 flex items-center justify-between mt-3">
                    <span className="text-[11px] text-mute font-medium">
                      {item.evaluation_count} {item.evaluation_count === 1 ? "Review" : "Reviews"}
                    </span>
                    <div className="flex items-center gap-2">
                      {item.repo_url && (
                        <a
                          href={item.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-line bg-canvas hover:text-primary transition"
                          title="View Repository"
                        >
                          <Github className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {item.demo_url && (
                        <a
                          href={item.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-line bg-canvas hover:text-emerald-500 transition"
                          title="View Live Demo"
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Full Standings Table */}
          <Card className="overflow-hidden p-0 border border-line">
            <div className="px-5 py-3.5 border-b border-line bg-surface-card flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                All Ranked Submissions ({leaderboard.length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-canvas/60 text-mute uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Squad & Project</th>
                    <th className="px-4 py-3">Problem Challenge</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Evaluations</th>
                    <th className="px-4 py-3 text-right">Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {leaderboard.map((item) => (
                    <tr key={item.project_id} className="hover:bg-canvas/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-sm text-ink">
                        #{item.rank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-ink">{item.project_title}</div>
                        <div className="text-[11px] text-mute">{item.team_name}</div>
                      </td>
                      <td className="px-4 py-3 text-mute">
                        {item.problem_title || "General Challenge"}
                        {item.problem_domain && (
                          <span className="ml-2 inline-flex">
                            <Badge tone="info">
                              {item.problem_domain}
                            </Badge>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-primary">
                        {item.average_score.toFixed(1)} / 100
                      </td>
                      <td className="px-4 py-3 text-mute">
                        {item.evaluation_count} reviews
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {item.repo_url && (
                            <a
                              href={item.repo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-mute hover:text-primary transition"
                              title="Code"
                            >
                              <Github className="h-4 w-4" />
                            </a>
                          )}
                          {item.demo_url && (
                            <a
                              href={item.demo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-mute hover:text-emerald-500 transition"
                              title="Demo"
                            >
                              <Globe className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Judging Modal */}
      <JudgeModal
        hackathon={hackathon}
        open={judgeModalOpen}
        onClose={() => setJudgeModalOpen(false)}
        onSaved={loadLeaderboard}
      />
    </div>
  );
}
