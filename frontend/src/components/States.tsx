import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-card border border-line bg-surface-card/85 backdrop-blur-xl shadow-card transition-all duration-300 text-ink ${className}`}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-800/80 border border-slate-700/40 ${className}`} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-slate-700/80 bg-surface/60 px-6 py-12 text-center text-ink">
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-mute">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-card border border-rose-500/30 bg-rose-950/40 p-5 text-rose-200">
      <p className="text-sm font-medium">{message}</p>
      {onRetry ? (
        <button onClick={onRetry} className="mt-3 text-sm font-semibold text-cyan hover:underline">
          Try again
        </button>
      ) : null}
    </div>
  );
}
