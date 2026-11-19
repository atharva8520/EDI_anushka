import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "primary";
}) {
  const map = {
    neutral: "bg-slate-800 text-slate-300 border border-slate-700/70",
    success: "bg-emerald-950/70 text-emerald-300 border border-emerald-500/30",
    warning: "bg-amber-950/70 text-amber-300 border border-amber-500/30",
    danger: "bg-rose-950/70 text-rose-300 border border-rose-500/30",
    info: "bg-cyan-950/70 text-cyan-300 border border-cyan-500/30",
    primary: "bg-indigo-950/70 text-indigo-300 border border-indigo-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}

export function statusTone(status: string) {
  if (status === "active" || status === "published") return "success" as const;
  if (status === "draft") return "warning" as const;
  if (status === "completed") return "info" as const;
  if (status === "archived") return "neutral" as const;
  return "primary" as const;
}
