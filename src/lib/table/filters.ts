/**
 * Column filters for the shared DataTable (docs/PLAN.md §8). Filters are always
 * per person and live in the URL as `f.<column>=…` so a view can be shared.
 */

export type ColumnKind = "text" | "enum" | "date";

export type DatePreset = "overdue" | "this_week" | "next_30" | "no_date";
export const DATE_PRESETS: DatePreset[] = ["overdue", "this_week", "next_30", "no_date"];
export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  overdue: "Overdue",
  this_week: "This week",
  next_30: "Next 30 days",
  no_date: "No date",
};

/** Enum value used to match rows whose value is null ("Unassigned", "—"). */
export const NONE_VALUE = "none";

export type ColumnFilter =
  | { kind: "text"; contains: string }
  | { kind: "enum"; values: string[] }
  | { kind: "date"; preset: DatePreset }
  | { kind: "date"; from: string | null; to: string | null };

export type FilterState = Record<string, ColumnFilter>;

export interface FilterColumnMeta {
  id: string;
  kind: ColumnKind;
}

const FILTER_PREFIX = "f.";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isEmptyFilter(filter: ColumnFilter): boolean {
  switch (filter.kind) {
    case "text":
      return filter.contains.trim() === "";
    case "enum":
      return filter.values.length === 0;
    case "date":
      return "preset" in filter ? false : !filter.from && !filter.to;
  }
}

export function encodeFilter(filter: ColumnFilter): string | null {
  if (isEmptyFilter(filter)) return null;
  switch (filter.kind) {
    case "text":
      return filter.contains.trim();
    case "enum":
      return filter.values.join(",");
    case "date":
      if ("preset" in filter) return filter.preset;
      return `${filter.from ?? ""}..${filter.to ?? ""}`;
  }
}

export function decodeFilter(kind: ColumnKind, raw: string): ColumnFilter | null {
  const value = raw.trim();
  if (!value) return null;
  switch (kind) {
    case "text":
      return { kind, contains: value };
    case "enum":
      return { kind, values: value.split(",").filter(Boolean) };
    case "date": {
      if ((DATE_PRESETS as string[]).includes(value)) return { kind, preset: value as DatePreset };
      const [from = "", to = ""] = value.split("..");
      const f = DATE_RE.test(from) ? from : null;
      const t = DATE_RE.test(to) ? to : null;
      return f || t ? { kind, from: f, to: t } : null;
    }
  }
}

/** Writes filters onto URL params, replacing any existing `f.*` entries. */
export function writeFiltersToParams(params: URLSearchParams, filters: FilterState): void {
  for (const key of [...params.keys()]) if (key.startsWith(FILTER_PREFIX)) params.delete(key);
  for (const [column, filter] of Object.entries(filters)) {
    const encoded = encodeFilter(filter);
    if (encoded !== null) params.set(FILTER_PREFIX + column, encoded);
  }
}

export function readFiltersFromParams(
  params: URLSearchParams,
  columns: readonly FilterColumnMeta[],
): FilterState {
  const filters: FilterState = {};
  for (const column of columns) {
    const raw = params.get(FILTER_PREFIX + column.id);
    if (raw === null) continue;
    const filter = decodeFilter(column.kind, raw);
    if (filter) filters[column.id] = filter;
  }
  return filters;
}

export function hasFilterParams(params: URLSearchParams): boolean {
  return [...params.keys()].some((k) => k.startsWith(FILTER_PREFIX));
}

export interface DateContext {
  /** Today as YYYY-MM-DD in the workspace timezone. */
  today: string;
  weekStart: string;
  weekEnd: string;
  in30Days: string;
}

/** Monday–Sunday week containing `today`, plus the 30-day horizon. */
export function dateContext(today: string, addDays: (d: string, n: number) => string): DateContext {
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const weekStart = addDays(today, offsetToMonday);
  return { today, weekStart, weekEnd: addDays(weekStart, 6), in30Days: addDays(today, 30) };
}

export function matchesFilter(
  value: string | null | undefined,
  filter: ColumnFilter,
  dates: DateContext,
): boolean {
  switch (filter.kind) {
    case "text": {
      const needle = filter.contains.trim().toLowerCase();
      return !needle || (value ?? "").toLowerCase().includes(needle);
    }
    case "enum": {
      if (filter.values.length === 0) return true;
      return value == null ? filter.values.includes(NONE_VALUE) : filter.values.includes(value);
    }
    case "date": {
      if ("preset" in filter) {
        switch (filter.preset) {
          case "no_date":
            return value == null;
          case "overdue":
            return value != null && value < dates.today;
          case "this_week":
            return value != null && value >= dates.weekStart && value <= dates.weekEnd;
          case "next_30":
            return value != null && value >= dates.today && value <= dates.in30Days;
        }
      }
      if (value == null) return false;
      if (filter.from && value < filter.from) return false;
      if (filter.to && value > filter.to) return false;
      return true;
    }
  }
}

export function countActiveFilters(filters: FilterState): number {
  return Object.values(filters).filter((f) => !isEmptyFilter(f)).length;
}
