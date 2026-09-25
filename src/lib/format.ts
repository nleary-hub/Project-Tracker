/** Date display helpers. Workspace dates render in the workspace timezone (docs/PLAN.md D20). */

export function formatDate(value: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function formatDateTime(value: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(typeof value === "string" ? new Date(value) : value);
}
