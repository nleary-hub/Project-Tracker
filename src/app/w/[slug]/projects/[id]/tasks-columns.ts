import type { FilterColumnMeta } from "@/lib/table/filters";

/** Column ids and kinds for the tasks table, shared by server and client. */
export const TASK_COLUMNS: readonly FilterColumnMeta[] = [
  { id: "title", kind: "text" },
  { id: "status", kind: "enum" },
  { id: "priority", kind: "enum" },
  { id: "assignee", kind: "enum" },
  { id: "due", kind: "date" },
  { id: "created", kind: "date" },
  { id: "description", kind: "text" },
];

export const TASK_COLUMN_IDS = TASK_COLUMNS.map((c) => c.id);
