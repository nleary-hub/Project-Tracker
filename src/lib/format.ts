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
