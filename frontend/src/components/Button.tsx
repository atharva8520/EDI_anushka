import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "hn-gradient text-white shadow-glow hover:brightness-105",
  secondary: "bg-white text-ink border border-line hover:bg-canvas",
  ghost: "bg-transparent text-mute hover:bg-white hover:text-ink",
  danger: "bg-[#EF4444] text-white hover:bg-[#dc3a3a]",
  ai: "hn-gradient text-white shadow-glow gradient-move",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  loading?: boolean;
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
