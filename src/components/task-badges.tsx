import { cn } from "@/lib/utils";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";

const STATUS_DOT: Record<TaskStatus, string> = {
  todo: "bg-muted-foreground/50",
  in_progress: "bg-brand",
  blocked: "bg-health-off-track",
  done: "bg-health-on-track",
};

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-card px-2 text-xs font-medium whitespace-nowrap text-foreground",
        status === "done" && "text-muted-foreground",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} aria-hidden="true" />
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

/** Priority as a compact bar glyph (1–4 bars) plus label; never color alone. */
export function PriorityBadge({
  priority,
  className,
  showLabel = true,
}: {
  priority: TaskPriority;
  className?: string;
  showLabel?: boolean;
}) {
  const level = { low: 1, medium: 2, high: 3, urgent: 4 }[priority];
  const tone =
    priority === "urgent"
      ? "text-health-off-track"
      : priority === "high"
        ? "text-health-at-risk"
        : "text-muted-foreground";
  return (
    <span
      data-priority={priority}
      title={TASK_PRIORITY_LABELS[priority]}
      className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", tone, className)}
    >
      <span className="flex items-end gap-px" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={cn(
              "w-[3px] rounded-[1px] bg-current",
              n <= level ? "opacity-100" : "opacity-25",
            )}
            style={{ height: 4 + n * 2 }}
          />
        ))}
      </span>
      {showLabel && <span className="text-foreground/80">{TASK_PRIORITY_LABELS[priority]}</span>}
    </span>
  );
}
