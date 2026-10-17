export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "primary";
}) {
  const map = {
    neutral: "bg-[#F2F4F8] text-mute",
    success: "bg-[#DCFCE7] text-[#16A34A]",
    warning: "bg-[#FEF3C7] text-[#B45309]",
    danger: "bg-[#FEE2E2] text-[#EF4444]",
    info: "bg-[#DBEAFE] text-[#3B82F6]",
    primary: "bg-[#EDE9FE] text-primary",
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
