import type { FilterColumnMeta } from "@/lib/table/filters";

/**
 * Column ids and kinds for the projects table, shared by the server (to read
 * filters from the URL / saved state) and the client (to render).
 */
export const PROJECT_COLUMNS: readonly FilterColumnMeta[] = [
  { id: "name", kind: "text" },
  { id: "owner", kind: "enum" },
  { id: "status", kind: "enum" },
  { id: "nextMilestone", kind: "text" },
  { id: "nextDue", kind: "date" },
  { id: "due", kind: "date" },
  { id: "start", kind: "date" },
  { id: "description", kind: "text" },
  { id: "created", kind: "date" },
];

export const PROJECT_COLUMN_IDS = PROJECT_COLUMNS.map((c) => c.id);
