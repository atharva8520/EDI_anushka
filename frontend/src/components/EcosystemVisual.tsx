import { motion } from "framer-motion";

const cards = [
  { title: "Problem", meta: "PF-01 Capacity", color: "from-[#5B4BDB] to-[#8B5CF6]" },
  { title: "Team", meta: "Signal Room · 3", color: "from-[#20B8E6] to-[#5B4BDB]" },
  { title: "AI insight", meta: "Backend gap found", color: "from-[#8B5CF6] to-[#20B8E6]" },
  { title: "Project", meta: "64% planned", color: "from-[#4435B8] to-[#20B8E6]" },
];

export function EcosystemVisual() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[520px]">
      <div className="absolute inset-8 rounded-[36px] hn-gradient opacity-20 blur-2xl" />
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white/80 shadow-lift backdrop-blur">
        <div className="flex h-full flex-col items-center justify-center">
          <div className="h-10 w-10 rounded-2xl hn-gradient" />
          <p className="mt-3 text-sm font-bold">HackNova core</p>
          <p className="text-xs text-mute">Connected AI journey</p>
        </div>
      </div>
      {cards.map((card, i) => {
        const pos = [
          "left-0 top-6",
          "right-0 top-16",
          "left-4 bottom-8",
          "right-2 bottom-4",
        ][i];
        return (
          <motion.div
            key={card.title}
            className={`absolute ${pos} w-44 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-card backdrop-blur`}
            animate={{ y: [0, i % 2 === 0 ? -10 : 10, 0] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className={`mb-2 h-1.5 w-10 rounded-full bg-gradient-to-r ${card.color}`} />
            <p className="text-xs font-semibold uppercase tracking-wide text-mute">{card.title}</p>
            <p className="text-sm font-bold text-ink">{card.meta}</p>
          </motion.div>
        );
      })}
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 520 420" fill="none">
        <path d="M260 210 L90 70" stroke="#5B4BDB" strokeWidth="1.2" />
        <path d="M260 210 L430 90" stroke="#20B8E6" strokeWidth="1.2" />
        <path d="M260 210 L80 330" stroke="#8B5CF6" strokeWidth="1.2" />
        <path d="M260 210 L430 340" stroke="#5B4BDB" strokeWidth="1.2" />
      </svg>
    </div>
  );
}
