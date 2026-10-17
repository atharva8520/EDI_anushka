import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PageIntro({
  kicker,
  title,
  body,
  action,
}: {
  kicker?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
    >
      <div>
        {kicker ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{kicker}</p> : null}
        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight md:text-[40px]">{title}</h1>
        {body ? <p className="mt-2 max-w-2xl text-sm text-mute md:text-base">{body}</p> : null}
      </div>
      {action}
    </motion.div>
  );
}
