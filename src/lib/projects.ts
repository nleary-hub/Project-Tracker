/** Project vocabulary shared by forms, tables and reports (docs/PLAN.md §4). */

export const PROJECT_STATUSES = ["active", "on_hold", "completed", "cancelled"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Statuses that are reported with a health rating rather than their status label. */
export function isActiveStatus(status: ProjectStatus): boolean {
  return status === "active";
}

/** Today's date in a timezone as YYYY-MM-DD, the format `date` columns use. */
export function todayInTimezone(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Add whole days to a YYYY-MM-DD date without timezone drift. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}
