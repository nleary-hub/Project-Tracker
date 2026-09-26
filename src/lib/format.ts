/** Date display helpers. Timestamps render in the workspace timezone (docs/PLAN.md D20). */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formats a `date` column value (YYYY-MM-DD, no timezone) or a timestamp.
 * A calendar date is the same day everywhere, so it is formatted in UTC to
 * avoid sliding to the previous day west of Greenwich.
 */
export function formatDate(value: string | Date, timeZone: string): string {
  const dateOnly = typeof value === "string" && DATE_ONLY.test(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: dateOnly ? "UTC" : timeZone,
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateTime(value: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(typeof value === "string" ? new Date(value) : value);
}

/** "just now", "4m ago", "3h ago", "2d ago"; older dates fall back to the calendar date. */
export function timeAgo(value: string | Date, now: Date = new Date(), timeZone = "UTC"): string {
  const then = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(then, timeZone);
}
