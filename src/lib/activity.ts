import type { Json } from "@/lib/supabase/database.types";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/tasks";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/projects";

/**
 * Activity events are written by database triggers (docs/PLAN.md §4). This
 * module turns a row into a sentence for the feed and the report's "activity
 * this period" list. Payloads carry names, so a sentence still reads well
 * after the task or milestone it mentions has been deleted.
 */

export const ACTIVITY_KINDS = [
  "project_created",
  "project_status_changed",
  "project_owner_changed",
  "project_department_changed",
  "project_health_overridden",
  "milestone_created",
  "milestone_completed",
  "milestone_reopened",
  "milestone_date_changed",
  "milestone_deleted",
  "task_created",
  "task_completed",
  "task_reopened",
  "task_status_changed",
  "task_assigned",
  "task_date_changed",
  "task_deleted",
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export interface ActivityLike {
  kind: ActivityKind;
  payload: Json;
}

/** Sentence fragment after the actor's name: "completed the task *Ship it*". */
export interface ActivityText {
  verb: string;
  /** The named thing, rendered with emphasis. */
  subject: string | null;
  /** Trailing detail, e.g. "from Oct 3 to Oct 10". */
  detail: string | null;
}

function str(payload: Json, key: string): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const v = payload[key];
  return typeof v === "string" && v !== "" ? v : null;
}

function statusLabel(value: string | null): string {
  if (!value) return "—";
  return (
    (PROJECT_STATUS_LABELS as Record<string, string>)[value] ??
    (TASK_STATUS_LABELS as Record<string, string>)[value] ??
    value
  );
}

export function describeActivity(
  event: ActivityLike,
  formatDate: (isoDate: string) => string = (d) => d,
): ActivityText {
  const p = event.payload;
  const name = str(p, "name");
  const title = str(p, "title");
  const from = str(p, "from");
  const to = str(p, "to");
  const dates = (a: string | null, b: string | null) => {
    if (a && b) return `from ${formatDate(a)} to ${formatDate(b)}`;
    if (b) return `to ${formatDate(b)}`;
    if (a) return `(was ${formatDate(a)}, now undated)`;
    return null;
  };

  switch (event.kind) {
    case "project_created":
      return { verb: "created the project", subject: name, detail: null };
    case "project_status_changed":
      return {
        verb: "changed the status",
        subject: null,
        detail: `from ${statusLabel(from as ProjectStatus)} to ${statusLabel(to as ProjectStatus)}`,
      };
    case "project_owner_changed":
      return {
        verb: to ? "made" : "removed the owner",
        subject: to,
        detail: to ? `the owner${from ? ` (was ${from})` : ""}` : from ? `(${from})` : null,
      };
    case "project_department_changed":
      return {
        verb: "moved the project",
        subject: null,
        detail: `from ${from ?? "—"} to ${to ?? "—"}`,
      };
    case "project_health_overridden": {
      const health = str(p, "health");
      const reason = str(p, "reason");
      return health
        ? {
            verb: "set the health override to",
            subject: health.replace("_", " "),
            detail: reason ? `— ${reason}` : null,
          }
        : { verb: "cleared the health override", subject: null, detail: null };
    }
    case "milestone_created":
      return { verb: "added the milestone", subject: name, detail: null };
    case "milestone_completed":
      return { verb: "completed the milestone", subject: name, detail: null };
    case "milestone_reopened":
      return { verb: "reopened the milestone", subject: name, detail: null };
    case "milestone_date_changed":
      return { verb: "moved the milestone", subject: name, detail: dates(from, to) };
    case "milestone_deleted":
      return { verb: "deleted the milestone", subject: name, detail: null };
    case "task_created": {
      const assignee = str(p, "assignee");
      return {
        verb: "added the task",
        subject: title,
        detail: assignee ? `for ${assignee}` : null,
      };
    }
    case "task_completed":
      return { verb: "completed the task", subject: title, detail: null };
    case "task_reopened":
      return {
        verb: "reopened the task",
        subject: title,
        detail: to ? `as ${statusLabel(to as TaskStatus)}` : null,
      };
    case "task_status_changed":
      return {
        verb: "marked the task",
        subject: title,
        detail: `${statusLabel(to as TaskStatus)}${from ? ` (was ${statusLabel(from as TaskStatus)})` : ""}`,
      };
    case "task_assigned":
      return to
        ? { verb: "assigned the task", subject: title, detail: `to ${to}` }
        : { verb: "unassigned the task", subject: title, detail: from ? `from ${from}` : null };
    case "task_date_changed":
      return { verb: "moved the task", subject: title, detail: dates(from, to) };
    case "task_deleted":
      return { verb: "deleted the task", subject: title, detail: null };
  }
}

/** Plain-text form, for the report and tests. */
export function activitySentence(
  actor: string,
  event: ActivityLike,
  formatDate?: (isoDate: string) => string,
): string {
  const t = describeActivity(event, formatDate);
  return [actor, t.verb, t.subject, t.detail].filter(Boolean).join(" ");
}

/** Kinds that the report's "activity this period" summary counts (docs/PLAN.md §6). */
export const REPORTED_ACTIVITY_KINDS: readonly ActivityKind[] = [
  "task_completed",
  "milestone_completed",
  "milestone_date_changed",
];
