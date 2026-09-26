/**
 * Table layout model and the "who sees what" rules (docs/PLAN.md §8, D25).
 *
 *              | row order | columns, widths, hidden, row height | sort     | filters
 *   shared     | everyone  | everyone                            | everyone | per person
 *   split      | everyone  | per person                          | per person | per person
 *   personal   | per person| per person                          | per person | per person
 */

export type LayoutSharingMode = "shared" | "split" | "personal";
export type Density = "compact" | "default" | "comfortable";

export interface SortRule {
  id: string;
  desc: boolean;
}

export interface TableLayout {
  columnOrder: string[];
  columnWidths: Record<string, number>;
  hiddenColumns: string[];
  sort: SortRule[];
  density: Density;
  rowHeightPx: number | null;
}

export const DENSITY_ROW_HEIGHT: Record<Density, number> = {
  compact: 32,
  default: 40,
  comfortable: 52,
};

export const MIN_ROW_HEIGHT = 24;
export const MAX_ROW_HEIGHT = 240;

export function emptyLayout(): TableLayout {
  return {
    columnOrder: [],
    columnWidths: {},
    hiddenColumns: [],
    sort: [],
    density: "default",
    rowHeightPx: null,
  };
}

export function effectiveRowHeight(layout: Pick<TableLayout, "density" | "rowHeightPx">): number {
  return layout.rowHeightPx ?? DENSITY_ROW_HEIGHT[layout.density];
}

/** Which stored layout each aspect is read from and written to. */
export interface LayoutTargets {
  columns: "shared" | "personal";
  rowOrder: "shared" | "personal";
}

export function layoutTargets(mode: LayoutSharingMode): LayoutTargets {
  switch (mode) {
    case "shared":
      return { columns: "shared", rowOrder: "shared" };
    case "split":
      return { columns: "personal", rowOrder: "shared" };
    case "personal":
      return { columns: "personal", rowOrder: "personal" };
  }
}

/** Picks the layout that applies for this user in this mode. */
export function resolveLayout(
  mode: LayoutSharingMode,
  shared: TableLayout | null,
  personal: TableLayout | null,
): TableLayout {
  const source = layoutTargets(mode).columns === "shared" ? shared : personal;
  return source ?? emptyLayout();
}

/** Puts stored order first (dropping unknown ids), then any new columns in their default order. */
export function orderedColumnIds(
  defaultIds: readonly string[],
  stored: readonly string[],
): string[] {
  const known = new Set(defaultIds);
  const result = stored.filter((id) => known.has(id));
  for (const id of defaultIds) if (!result.includes(id)) result.push(id);
  return result;
}

/** `sort=due,-name` ⇄ [{id:"due",desc:false},{id:"name",desc:true}] */
export function encodeSort(sort: readonly SortRule[]): string {
  return sort.map((s) => (s.desc ? `-${s.id}` : s.id)).join(",");
}

export function decodeSort(raw: string | null, validIds: readonly string[]): SortRule[] {
  if (!raw) return [];
  const valid = new Set(validIds);
  const out: SortRule[] = [];
  for (const part of raw.split(",")) {
    const desc = part.startsWith("-");
    const id = desc ? part.slice(1) : part;
    if (valid.has(id) && !out.some((s) => s.id === id)) out.push({ id, desc });
  }
  return out;
}

/**
 * Header click cycle: none → asc → desc → none. With `additive` (shift-click)
 * the column is appended as a further sort level instead of replacing the sort.
 */
export function cycleSort(sort: readonly SortRule[], id: string, additive: boolean): SortRule[] {
  const existing = sort.find((s) => s.id === id);
  const others = sort.filter((s) => s.id !== id);
  if (!existing) return additive ? [...sort, { id, desc: false }] : [{ id, desc: false }];
  if (!existing.desc) {
    const next = { id, desc: true };
    return additive ? sort.map((s) => (s.id === id ? next : s)) : [next];
  }
  return additive ? others : [];
}

/** Clamp a dragged row height to the allowed band. */
export function clampRowHeight(px: number): number {
  return Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, Math.round(px)));
}
