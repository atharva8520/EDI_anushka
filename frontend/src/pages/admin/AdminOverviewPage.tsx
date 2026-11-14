import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  Users2,
  UserCheck,
  CheckCircle2,
  FileCode,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { api } from "../../api/client";
import { Card, EmptyState } from "../../components/States";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import type {
  AdminStats,
  AdminActivityResponse,
  AIFeedbackSummary,
} from "../../types";

export function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<AdminActivityResponse | null>(null);
  const [feedback, setFeedback] = useState<AIFeedbackSummary | null>(null);
  const [days, setDays] = useState<number>(30);

  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, actRes] = await Promise.all([
          api.get<AdminStats>("/admin/stats"),
          api.get<AdminActivityResponse>(`/admin/activity?days=${days}`),
        ]);
        setStats(statsRes.data);
        setActivity(actRes.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load admin overview metrics");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [days]);

  useEffect(() => {
    setFeedbackError(null);
    api
      .get<AIFeedbackSummary>("/ai/feedback/summary")
      .then((res) => setFeedback(res.data))
      .catch((err) => {
        setFeedbackError(err.response?.data?.detail || "Failed to load matching feedback summary");
      });
  }, []);

  async function handleDaysChange(newDays: number) {
    setDays(newDays);
    setActivityLoading(true);
    try {
      const res = await api.get<AdminActivityResponse>(`/admin/activity?days=${newDays}`);
      setActivity(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load activity series");
    } finally {
      setActivityLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-line animate-pulse p-4" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-white border border-line animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Top 6 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Hackathons</span>
            <Compass className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-ink">{stats?.total_hackathons ?? 0}</span>
            <span className="text-[11px] text-mute ml-1">total</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Active</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-600">{stats?.active_hackathons ?? 0}</span>
            <span className="text-[11px] text-mute ml-1">running</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Published</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-ink">{stats?.published_hackathons ?? 0}</span>
            <span className="text-[11px] text-mute ml-1">open</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Builders</span>
            <UserCheck className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-ink">{stats?.participants ?? 0}</span>
            <span className="text-[11px] text-mute ml-1">students</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Squads</span>
            <Users2 className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-ink">{stats?.teams ?? 0}</span>
            <span className="text-[11px] text-mute ml-1">formed</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Challenges</span>
            <FileCode className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-ink">{stats?.problems ?? 0}</span>
            <span className="text-[11px] text-mute ml-1">problems</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Activity Chart + Feedback Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Activity Series (Span 2 cols) */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Ecosystem Activity Velocity</h3>
                  <p className="text-[11px] text-mute">Daily new builders, squad creations, and completed deliverable tasks</p>
                </div>
              </div>

              {/* Days Selector Pill Group */}
              <div className="flex items-center gap-1 rounded-btn bg-canvas p-1 border border-line self-start sm:self-auto">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleDaysChange(d)}
                    className={`px-3 py-1 text-xs font-bold rounded-btn transition ${
                      days === d
                        ? "bg-white text-primary shadow-xs"
                        : "text-mute hover:text-ink"
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Area */}
            <div className="mt-6 h-64 w-full">
              {activityLoading ? (
                <div className="h-full grid place-items-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-mute" />
                </div>
              ) : activity && activity.series.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activity.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "12px",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Line
                      type="monotone"
                      dataKey="new_students"
                      name="New Builders"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="new_teams"
                      name="New Squads"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="tasks_completed"
                      name="Tasks Completed"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full grid place-items-center text-xs text-mute">
                  No activity series recorded for the selected window.
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Suggestion Feedback Card (Admin only) */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-line">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Smart Suggestions Feedback</h3>
                <p className="text-[11px] text-mute">Weighted matching organizer evaluation</p>
              </div>
            </div>

            {feedbackError ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{feedbackError}</span>
              </div>
            ) : feedback && feedback.total_runs > 0 ? (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-canvas p-3 border border-line">
                    <span className="text-[10px] font-bold text-mute uppercase tracking-wider">Runs Executed</span>
                    <p className="text-xl font-extrabold text-ink mt-1">{feedback.total_runs}</p>
                  </div>
                  <div className="rounded-xl bg-canvas p-3 border border-line">
                    <span className="text-[10px] font-bold text-mute uppercase tracking-wider">Feedback Logs</span>
                    <p className="text-xl font-extrabold text-ink mt-1">{feedback.total_feedback}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-line p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink flex items-center gap-1.5">
                      <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                      Satisfaction Rate
                    </span>
                    <span className="font-black text-emerald-600">{feedback.satisfaction_rate}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${feedback.satisfaction_rate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-mute pt-1">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3 text-emerald-500" /> {feedback.positive_feedback} positive
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsDown className="h-3 w-3 text-rose-400" /> {feedback.negative_feedback} negative
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8">
                <EmptyState
                  title="No Matching Feedback Yet"
                  body="When squad leaders browse and rate recommended teammates, ratings appear here."
                />
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-line text-right">
            <Link to="/app/admin/teams">
              <Button variant="secondary" className="text-xs py-1.5">
                Inspect Squads &rarr;
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Per-Hackathon Supervised Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div>
            <h3 className="text-sm font-bold text-ink">Supervised Hackathons</h3>
            <p className="text-[11px] text-mute">Live operational readiness and deliverable metrics across events</p>
          </div>
          <Link to="/app/admin/hackathons">
            <Button variant="secondary" className="text-xs py-1.5">
              Manage Hackathons
            </Button>
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-mute uppercase tracking-wider text-[10px]">
                <th className="py-2.5 font-bold">Hackathon</th>
                <th className="py-2.5 font-bold">Status</th>
                <th className="py-2.5 font-bold text-center">Squads</th>
                <th className="py-2.5 font-bold text-center">Builders</th>
                <th className="py-2.5 font-bold text-center">Ready Squads</th>
                <th className="py-2.5 font-bold text-center">Locked Problem</th>
                <th className="py-2.5 font-bold text-center">Workspace</th>
                <th className="py-2.5 font-bold text-right">Tasks (Done/Tot)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {activity && activity.hackathons.length > 0 ? (
                activity.hackathons.map((h) => (
                  <tr key={h.id} className="hover:bg-canvas/50 transition">
                    <td className="py-3 font-semibold text-ink">
                      <Link to={`/app/admin/hackathons/${h.id}/problems`} className="hover:text-primary">
                        {h.name}
                      </Link>
                    </td>
                    <td className="py-3">
                      <Badge tone={h.status === "active" ? "success" : h.status === "published" ? "primary" : "neutral"}>
                        {h.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 text-center font-bold text-ink">{h.team_count}</td>
                    <td className="py-3 text-center text-mute">{h.participant_count}</td>
                    <td className="py-3 text-center">
                      <span className={h.ready_team_count > 0 ? "text-emerald-600 font-bold" : "text-mute"}>
                        {h.ready_team_count}
                      </span>
                    </td>
                    <td className="py-3 text-center text-mute">{h.teams_with_problem}</td>
                    <td className="py-3 text-center text-mute">{h.teams_with_project}</td>
                    <td className="py-3 text-right font-medium text-ink">
                      {h.tasks_completed} / {h.tasks_total}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-mute">
                    No hackathons available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
