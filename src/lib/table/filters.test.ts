import { describe, expect, it } from "vitest";

import { addDays } from "@/lib/projects";

import {
  dateContext,
  decodeFilter,
  encodeFilter,
  matchesFilter,
  readFiltersFromParams,
  writeFiltersToParams,
} from "./filters";

const dates = dateContext("2026-09-25", addDays); // a Friday

describe("filter codec", () => {
  it("round-trips every filter kind through URL params", () => {
    const params = new URLSearchParams("page=2&f.stale=x");
    writeFiltersToParams(params, {
      name: { kind: "text", contains: " erp " },
      status: { kind: "enum", values: ["active", "on_hold"] },
      due: { kind: "date", from: "2026-10-01", to: null },
      start: { kind: "date", preset: "overdue" },
      empty: { kind: "enum", values: [] },
    });
    expect(params.get("page")).toBe("2");
    expect(params.has("f.stale")).toBe(false);
    expect(params.has("f.empty")).toBe(false);
    expect(params.get("f.due")).toBe("2026-10-01..");

    const read = readFiltersFromParams(params, [
      { id: "name", kind: "text" },
      { id: "status", kind: "enum" },
      { id: "due", kind: "date" },
      { id: "start", kind: "date" },
      { id: "missing", kind: "text" },
    ]);
    expect(read).toEqual({
      name: { kind: "text", contains: "erp" },
      status: { kind: "enum", values: ["active", "on_hold"] },
      due: { kind: "date", from: "2026-10-01", to: null },
      start: { kind: "date", preset: "overdue" },
    });
  });

  it("ignores malformed dates and blank values", () => {
    expect(decodeFilter("date", "not-a-date..")).toBeNull();
    expect(decodeFilter("text", "   ")).toBeNull();
    expect(encodeFilter({ kind: "text", contains: "  " })).toBeNull();
  });
});

describe("matchesFilter", () => {
  it("text is a case-insensitive contains", () => {
    expect(matchesFilter("ERP upgrade", { kind: "text", contains: "erp" }, dates)).toBe(true);
    expect(matchesFilter(null, { kind: "text", contains: "erp" }, dates)).toBe(false);
  });

  it("enum matches any selected value and 'none' matches null", () => {
    const f = { kind: "enum" as const, values: ["active", "none"] };
    expect(matchesFilter("active", f, dates)).toBe(true);
    expect(matchesFilter(null, f, dates)).toBe(true);
    expect(matchesFilter("completed", f, dates)).toBe(false);
  });

  it("date presets use the workspace's today", () => {
    expect(dates.weekStart).toBe("2026-09-21");
    expect(dates.weekEnd).toBe("2026-09-27");
    const overdue = { kind: "date" as const, preset: "overdue" as const };
    expect(matchesFilter("2026-09-24", overdue, dates)).toBe(true);
    expect(matchesFilter("2026-09-25", overdue, dates)).toBe(false);
    expect(matchesFilter("2026-09-27", { kind: "date", preset: "this_week" }, dates)).toBe(true);
    expect(matchesFilter("2026-10-25", { kind: "date", preset: "next_30" }, dates)).toBe(true);
    expect(matchesFilter("2026-10-26", { kind: "date", preset: "next_30" }, dates)).toBe(false);
    expect(matchesFilter(null, { kind: "date", preset: "no_date" }, dates)).toBe(true);
  });

  it("date ranges are inclusive and open-ended", () => {
    expect(matchesFilter("2026-10-01", { kind: "date", from: "2026-10-01", to: null }, dates)).toBe(
      true,
    );
    expect(matchesFilter("2026-09-30", { kind: "date", from: "2026-10-01", to: null }, dates)).toBe(
      false,
    );
    expect(matchesFilter(null, { kind: "date", from: null, to: "2026-12-31" }, dates)).toBe(false);
  });
});
