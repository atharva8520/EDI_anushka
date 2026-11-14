import { CheckCircle2, Clock, AlertTriangle, Layers, User } from "lucide-react";
import type { ProjectSummary } from "../../types";
import { Card, Skeleton } from "../../components/States";
import { Badge } from "../../components/Badge";

interface SummaryCardsProps {
  summary: ProjectSummary | null;
  loading: boolean;
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-4">
      {/* 4 Key Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Progress Card */}
        <Card className="p-4 transition hover:shadow-cardHover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-mute">Progress</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#16A34A]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{summary.percent_complete}%</span>
            <span className="text-xs text-mute">
              ({summary.completed_tasks}/{summary.total_tasks} completed)
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#EEF0F6]">
            <div
              className="h-full rounded-full bg-[#16A34A] transition-all duration-500"
              style={{ width: `${summary.percent_complete}%` }}
            />
          </div>
        </Card>

        {/* Tasks Breakdown */}
        <Card className="p-4 transition hover:shadow-cardHover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-mute">Total Tasks</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDE9FE] text-primary">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{summary.total_tasks}</span>
            <span className="text-xs text-mute">tasks across board</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded bg-[#F2F4F8] px-1.5 py-0.5 font-medium text-mute">
              To Do: {summary.todo_tasks}
            </span>
            <span className="rounded bg-[#DBEAFE] px-1.5 py-0.5 font-medium text-[#2563EB]">
              In Prog: {summary.in_progress_tasks}
            </span>
            <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 font-medium text-[#D97706]">
              Review: {summary.review_tasks}
            </span>
          </div>
        </Card>

        {/* Overdue Card */}
        <Card className="p-4 transition hover:shadow-cardHover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-mute">Deadline Health</span>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                summary.overdue_tasks > 0 ? "bg-[#FEE2E2] text-[#EF4444]" : "bg-[#DCFCE7] text-[#16A34A]"
              }`}
            >
              {summary.overdue_tasks > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                summary.overdue_tasks > 0 ? "text-[#EF4444]" : "text-ink"
              }`}
            >
              {summary.overdue_tasks}
            </span>
            <span className="text-xs text-mute">overdue tasks</span>
          </div>
          <div className="mt-3">
            {summary.overdue_tasks > 0 ? (
              <Badge tone="danger">Attention needed</Badge>
            ) : (
              <Badge tone="success">All deadlines on track</Badge>
            )}
          </div>
        </Card>

        {/* Assignment & Unassigned */}
        <Card className="p-4 transition hover:shadow-cardHover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-mute">Unassigned Tasks</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F2F4F8] text-mute">
              <User className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{summary.unassigned_count}</span>
            <span className="text-xs text-mute">need assignment</span>
          </div>
          <div className="mt-3 text-xs text-mute">
            {summary.member_workloads.length > 0
              ? `${summary.member_workloads.length} active squad member${
                  summary.member_workloads.length > 1 ? "s" : ""
                }`
              : "No active squad members"}
          </div>
        </Card>
      </div>

      {/* Member Workload Bar */}
      {summary.member_workloads.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-mute">
              Active Member Workload & Ownership
            </h4>
            <span className="text-xs text-mute">
              Total assigned: {summary.total_tasks - summary.unassigned_count} | Unassigned: {summary.unassigned_count}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {summary.member_workloads.map((mw) => (
              <div
                key={mw.user_id}
                className="flex items-center justify-between rounded-lg border border-line bg-canvas/40 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                    {mw.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate font-semibold text-ink">{mw.full_name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-medium text-mute">
                  <span className="text-[#16A34A]">{mw.completed_count}</span>/
                  <span className="font-bold text-ink">{mw.task_count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
