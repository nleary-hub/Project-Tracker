/**
 * Project health vocabulary shared by badges, tables, charts, PDF and email.
 * The calculation rules arrive in M5; this module only defines how each
 * status is named and drawn (docs/PLAN.md §5, §7).
 */

export const HEALTH_STATUSES = ["on_track", "at_risk", "off_track"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const INACTIVE_STATUSES = ["on_hold", "completed", "cancelled"] as const;
export type InactiveStatus = (typeof INACTIVE_STATUSES)[number];

export type HealthDisplayStatus = HealthStatus | InactiveStatus;

export type HealthShape = "circle" | "triangle" | "diamond" | "ring";

export interface HealthMeta {
  label: string;
  shape: HealthShape;
  /** CSS custom property holding the status color. */
  colorVar: string;
}

export const HEALTH_META: Record<HealthDisplayStatus, HealthMeta> = {
  on_track: { label: "On track", shape: "circle", colorVar: "--health-on-track" },
  at_risk: { label: "At risk", shape: "triangle", colorVar: "--health-at-risk" },
  off_track: { label: "Off track", shape: "diamond", colorVar: "--health-off-track" },
  on_hold: { label: "On hold", shape: "ring", colorVar: "--health-inactive" },
  completed: { label: "Completed", shape: "ring", colorVar: "--health-inactive" },
  cancelled: { label: "Cancelled", shape: "ring", colorVar: "--health-inactive" },
};

export function healthMeta(status: HealthDisplayStatus): HealthMeta {
  return HEALTH_META[status];
}
