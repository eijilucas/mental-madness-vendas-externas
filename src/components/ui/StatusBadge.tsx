import type { ReactNode } from "react";

type StatusTone = "success" | "danger" | "warning" | "info" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  success: "border-success/40 text-success",
  danger: "border-danger/40 text-danger",
  warning: "border-warning/40 text-warning",
  info: "border-info/40 text-info",
  neutral: "border-border text-text-muted",
};

interface StatusBadgeProps {
  tone: StatusTone;
  icon?: ReactNode;
  children: ReactNode;
}

export function StatusBadge({ tone, icon, children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${toneClasses[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
