export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl hn-gradient shadow-glow">
        <span className="h-3 w-3 rounded-sm bg-white/95" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#20B8E6]" />
      </span>
      {compact ? null : (
        <span className="text-lg font-extrabold tracking-tight text-ink">
          Hack<span className="text-primary">Nova</span>
        </span>
      )}
    </div>
  );
}
