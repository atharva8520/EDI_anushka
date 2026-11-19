import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { motion, type HTMLMotionProps } from "framer-motion";

const variants = {
  primary:
    "hn-gradient text-white font-bold shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(0,242,254,0.45)] hover:brightness-110",
  secondary:
    "bg-slate-900/90 text-slate-200 border border-slate-700/80 hover:bg-slate-800 hover:border-cyan-500/50 hover:text-white shadow-sm",
  ghost:
    "bg-transparent text-slate-400 hover:bg-slate-800/70 hover:text-white",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.3)]",
  ai:
    "bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-bold shadow-[0_0_25px_rgba(139,92,246,0.4)] hover:shadow-[0_0_35px_rgba(0,242,254,0.6)]",
};

interface Props extends HTMLMotionProps<"button"> {
  variant?: keyof typeof variants;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({ variant = "primary", loading, className = "", children, disabled, ...rest }: Props) {
  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-btn px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </motion.button>
  );
}
