export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-purple-600 via-violet-600 to-indigo-500 shadow-[0_0_20px_rgba(168,85,247,0.45)] text-white font-black text-lg select-none">
        H
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-pink-400 ring-2 ring-canvas animate-pulse" />
      </span>
      {compact ? null : (
        <span className="text-lg font-black tracking-tight text-white flex items-center">
          Hack<span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Nova</span>
        </span>
      )}
    </div>
  );
}
