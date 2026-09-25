import { type HealthDisplayStatus, type HealthShape, healthMeta } from "@/lib/health";
import { cn } from "@/lib/utils";

function ShapeIcon({ shape, colorVar }: { shape: HealthShape; colorVar: string }) {
  const color = `var(${colorVar})`;
  return (
    <svg
      viewBox="0 0 12 12"
      width={12}
      height={12}
      aria-hidden="true"
      data-shape={shape}
      className="shrink-0"
    >
      {shape === "circle" && <circle cx="6" cy="6" r="5" fill={color} />}
      {shape === "triangle" && <path d="M6 1 11 10.5H1Z" fill={color} />}
      {shape === "diamond" && <path d="M6 0.5 11.5 6 6 11.5 0.5 6Z" fill={color} />}
      {shape === "ring" && (
        <circle cx="6" cy="6" r="4.5" fill="none" stroke={color} strokeWidth="1.5" />
      )}
    </svg>
  );
}

export interface HealthBadgeProps {
  status: HealthDisplayStatus;
  /** Set when an admin or owner has overridden the calculated value. */
  override?: boolean;
  className?: string;
}

/**
 * Health is never shown by color alone: every badge pairs a distinct shape
 * with a text label so it reads in greyscale print and for color-blind users.
 * The label uses ink tokens, never the status color.
 */
export function HealthBadge({ status, override, className }: HealthBadgeProps) {
  const meta = healthMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2 py-0.5 text-xs font-medium whitespace-nowrap text-ink",
        className,
      )}
      data-status={status}
    >
      <ShapeIcon shape={meta.shape} colorVar={meta.colorVar} />
      {meta.label}
      {override && (
        <span className="text-[10px] font-normal tracking-wide text-ink-muted uppercase">
          override
        </span>
      )}
    </span>
  );
}
