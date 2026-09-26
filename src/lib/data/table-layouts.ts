import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json, Tables } from "@/lib/supabase/database.types";
import {
  type ColumnFilter,
  type FilterColumnMeta,
  type FilterState,
  decodeFilter,
  encodeFilter,
} from "@/lib/table/filters";
import type { Density, LayoutSharingMode, SortRule, TableLayout } from "@/lib/table/layout";

export type TableKey = "projects" | "tasks" | "milestones" | "report";

type LayoutRow = Pick<
  Tables<"table_layouts">,
  | "user_id"
  | "column_order"
  | "column_widths"
  | "hidden_columns"
  | "sort"
  | "density"
  | "row_height_px"
  | "updated_by"
  | "updated_at"
>;

function isRecord(v: Json): v is { [key: string]: Json | undefined } {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function toTableLayout(row: LayoutRow): TableLayout {
  const widths: Record<string, number> = {};
  if (isRecord(row.column_widths)) {
    for (const [k, v] of Object.entries(row.column_widths))
      if (typeof v === "number") widths[k] = v;
  }
  const sort: SortRule[] = [];
  if (Array.isArray(row.sort)) {
    for (const s of row.sort) {
      if (isRecord(s) && typeof s.id === "string") sort.push({ id: s.id, desc: s.desc === true });
    }
  }
  return {
    columnOrder: row.column_order,
    columnWidths: widths,
    hiddenColumns: row.hidden_columns,
    sort,
    density: row.density as Density,
    rowHeightPx: row.row_height_px,
  };
}

/** Saved per-person filters are stored in their URL encoding, keyed by column. */
export function parseFilterState(json: Json, columns: readonly FilterColumnMeta[]): FilterState {
  const filters: FilterState = {};
  if (!isRecord(json)) return filters;
  for (const column of columns) {
    const raw = json[column.id];
    if (typeof raw !== "string") continue;
    const filter = decodeFilter(column.kind, raw);
    if (filter) filters[column.id] = filter;
  }
  return filters;
}

export function serializeFilterState(filters: FilterState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, filter] of Object.entries(filters) as [string, ColumnFilter][]) {
    const encoded = encodeFilter(filter);
    if (encoded !== null) out[id] = encoded;
  }
  return out;
}

export interface TableState {
  mode: LayoutSharingMode;
  shared: TableLayout | null;
  personal: TableLayout | null;
  sharedChangedBy: { userId: string; at: string } | null;
  savedFilters: Json;
  personalRanks: Map<string, string>;
}

export async function getTableState(
  supabase: SupabaseClient<Database>,
  args: { workspaceId: string; userId: string; tableKey: TableKey },
): Promise<TableState> {
  const { workspaceId, userId, tableKey } = args;
  const [settings, layouts, filters, ranks] = await Promise.all([
    supabase
      .from("workspace_settings")
      .select("layout_sharing")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("table_layouts")
      .select(
        "user_id, column_order, column_widths, hidden_columns, sort, density, row_height_px, updated_by, updated_at",
      )
      .eq("workspace_id", workspaceId)
      .eq("table_key", tableKey),
    supabase
      .from("user_table_filters")
      .select("filters")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("table_key", tableKey)
      .maybeSingle(),
    supabase
      .from("user_row_ranks")
      .select("row_id, rank")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("table_key", tableKey),
  ]);

  const rows = layouts.data ?? [];
  const sharedRow = rows.find((r) => r.user_id === null) ?? null;
  const personalRow = rows.find((r) => r.user_id === userId) ?? null;

  return {
    mode: settings.data?.layout_sharing ?? "shared",
    shared: sharedRow ? toTableLayout(sharedRow) : null,
    personal: personalRow ? toTableLayout(personalRow) : null,
    sharedChangedBy: sharedRow?.updated_by
      ? { userId: sharedRow.updated_by, at: sharedRow.updated_at }
      : null,
    savedFilters: filters.data?.filters ?? {},
    personalRanks: new Map((ranks.data ?? []).map((r) => [r.row_id, r.rank])),
  };
}

/** Column patch → table_layouts columns. */
export function layoutPatchToRow(patch: Partial<TableLayout>) {
  const row: Partial<Tables<"table_layouts">> = {};
  if (patch.columnOrder !== undefined) row.column_order = patch.columnOrder;
  if (patch.columnWidths !== undefined) row.column_widths = patch.columnWidths;
  if (patch.hiddenColumns !== undefined) row.hidden_columns = patch.hiddenColumns;
  if (patch.sort !== undefined) row.sort = patch.sort.map((s) => ({ id: s.id, desc: s.desc }));
  if (patch.density !== undefined) row.density = patch.density;
  if (patch.rowHeightPx !== undefined) row.row_height_px = patch.rowHeightPx;
  return row;
}
