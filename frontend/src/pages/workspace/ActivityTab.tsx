import { useState, useEffect } from "react";
import { Clock, Activity, PlusCircle, MoveRight, Trash2, Edit } from "lucide-react";
import { api, apiError } from "../../api/client";
import type { ActivityLog } from "../../types";
import { Card, EmptyState, Skeleton } from "../../components/States";

interface ActivityTabProps {
  projectId: string;
}

export function ActivityTab({ projectId }: ActivityTabProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchActivity() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<ActivityLog[]>(`/api/projects/${projectId}/activity`);
        if (mounted) {
          setLogs(res.data);
        }
      } catch (err) {
        if (mounted) {
          setError(apiError(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchActivity();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const humanizeAction = (log: ActivityLog) => {
    const actor = log.actor_name || "A team member";
    const details = log.details || {};

    switch (log.action) {
      case "project_created":
        return (
          <span>
            <strong className="text-ink">{actor}</strong> created the project{" "}
            <span className="font-semibold text-primary">
              "{details.project_title || "Project"}"
            </span>
          </span>
        );
      case "task_created":
        return (
          <span>
            <strong className="text-ink">{actor}</strong> created task{" "}
            <span className="font-semibold text-ink">"{details.title || "Task"}"</span>
          </span>
        );
      case "task_updated":
        return (
          <span>
            <strong className="text-ink">{actor}</strong> updated task{" "}
            <span className="font-semibold text-ink">"{details.title || "Task"}"</span>
          </span>
        );
      case "task_moved":
        return (
          <span>
            <strong className="text-ink">{actor}</strong> moved task{" "}
            <span className="font-semibold text-ink">"{details.title || "Task"}"</span> from{" "}
            <span className="font-medium text-mute">{details.from_status}</span> to{" "}
            <span className="font-bold text-primary">{details.to_status}</span>
          </span>
        );
      case "task_deleted":
        return (
          <span>
            <strong className="text-ink">{actor}</strong> deleted task{" "}
            <span className="font-semibold text-[#EF4444]">"{details.title || "Task"}"</span>
          </span>
        );
      case "milestone_created":
        return (
          <span>
            <strong className="text-ink">{actor}</strong> added milestone{" "}
            <span className="font-semibold text-primary">"{details.title || "Milestone"}"</span>
          </span>
        );
      case "milestone_updated":
        return (
          <span>
            <strong className="text-ink">{actor}</strong> updated milestone{" "}
            <span className="font-semibold text-ink">"{details.title || "Milestone"}"</span>
          </span>
        );
      case "milestone_deleted":
        return (
          <span>
            <strong className="text-ink">{actor}</strong> deleted milestone{" "}
            <span className="font-semibold text-[#EF4444]">"{details.title || "Milestone"}"</span>
          </span>
        );
      default:
        return (
          <span>
            <strong className="text-ink">{actor}</strong> performed{" "}
            <span className="font-semibold text-ink">{log.action.replace("_", " ")}</span>
          </span>
        );
    }
  };

  const actionIcon = (action: string) => {
    switch (action) {
      case "task_created":
      case "milestone_created":
      case "project_created":
        return <PlusCircle className="h-4 w-4 text-primary" />;
      case "task_moved":
        return <MoveRight className="h-4 w-4 text-[#2563EB]" />;
      case "task_deleted":
      case "milestone_deleted":
        return <Trash2 className="h-4 w-4 text-[#EF4444]" />;
      case "task_updated":
      case "milestone_updated":
      default:
        return <Edit className="h-4 w-4 text-mute" />;
    }
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    );
  }

  if (error) {
    return (
      <div className="rounded-card border border-[#FECACA] bg-[#FEF2F2] p-4 text-xs font-semibold text-[#991B1B]">
        {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        title="No activity recorded yet"
        body="Actions performed by team members across tasks and milestones will be logged here in chronological order."
      />
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between border-b border-line pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-ink">Project Activity History</h3>
        </div>
        <span className="text-xs text-mute">{logs.length} entries recorded</span>
      </div>

      <div className="divide-y divide-line/50">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 py-3 text-xs">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-canvas border border-line">
              {actionIcon(log.action)}
            </span>

            <div className="flex-1">
              <p className="text-ink leading-relaxed">{humanizeAction(log)}</p>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-mute">
                <Clock className="h-3 w-3" />
                <span>{formatTimestamp(log.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
