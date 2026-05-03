import { cn } from "@/lib/utils";
import type { LogStatus } from "@/lib/mock-data";

const map: Record<LogStatus, { label: string; className: string; dot: string }> = {
  completed: {
    label: "Completed",
    className: "bg-success/10 text-success border-success/20",
    dot: "bg-success",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-info/10 text-info border-info/20",
    dot: "bg-info",
  },
  pending: {
    label: "Pending",
    className: "bg-warning/10 text-warning border-warning/20",
    dot: "bg-warning",
  },
};

export function StatusBadge({ status, className }: { status: LogStatus; className?: string }) {
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        s.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}