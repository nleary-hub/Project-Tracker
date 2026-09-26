import { describe, expect, it } from "vitest";

import {
  clampRowHeight,
  cycleSort,
  decodeSort,
  effectiveRowHeight,
  emptyLayout,
  encodeSort,
  layoutTargets,
  orderedColumnIds,
  resolveLayout,
} from "./layout";

describe("layout sharing rules", () => {
  it("routes each aspect per mode (PLAN §8 table)", () => {
    expect(layoutTargets("shared")).toEqual({ columns: "shared", rowOrder: "shared" });
    expect(layoutTargets("split")).toEqual({ columns: "personal", rowOrder: "shared" });
    expect(layoutTargets("personal")).toEqual({ columns: "personal", rowOrder: "personal" });
  });

  it("resolves the applicable layout with defaults as fallback", () => {
    const shared = { ...emptyLayout(), density: "compact" as const };
    const personal = { ...emptyLayout(), density: "comfortable" as const };
    expect(resolveLayout("shared", shared, personal).density).toBe("compact");
    expect(resolveLayout("split", shared, personal).density).toBe("comfortable");
    expect(resolveLayout("split", shared, null).density).toBe("default");
    expect(resolveLayout("personal", null, personal).density).toBe("comfortable");
  });
});

describe("column order", () => {
  it("keeps stored order, drops unknown ids and appends new columns", () => {
    expect(orderedColumnIds(["a", "b", "c", "d"], ["c", "zzz", "a"])).toEqual(["c", "a", "b", "d"]);
  });
});

describe("sort", () => {
  it("encodes and decodes with a leading minus for descending", () => {
    const sort = [
      { id: "due", desc: false },
      { id: "name", desc: true },
    ];
    expect(encodeSort(sort)).toBe("due,-name");
    expect(decodeSort("due,-name,-bogus,due", ["due", "name"])).toEqual(sort);
    expect(decodeSort(null, ["due"])).toEqual([]);
  });

  it("cycles none → asc → desc → none on plain clicks", () => {
    const s1 = cycleSort([], "due", false);
    expect(s1).toEqual([{ id: "due", desc: false }]);
    const s2 = cycleSort(s1, "due", false);
    expect(s2).toEqual([{ id: "due", desc: true }]);
    expect(cycleSort(s2, "due", false)).toEqual([]);
    expect(cycleSort([{ id: "name", desc: false }], "due", false)).toEqual([
      { id: "due", desc: false },
    ]);
  });

  it("shift-click adds and removes secondary levels without touching others", () => {
    const base = [{ id: "name", desc: false }];
    const added = cycleSort(base, "due", true);
    expect(added).toEqual([...base, { id: "due", desc: false }]);
    const flipped = cycleSort(added, "due", true);
    expect(flipped[1]).toEqual({ id: "due", desc: true });
    expect(cycleSort(flipped, "due", true)).toEqual(base);
  });
});

describe("row height", () => {
  it("uses the density preset unless a custom height is set", () => {
    expect(effectiveRowHeight({ density: "compact", rowHeightPx: null })).toBe(32);
    expect(effectiveRowHeight({ density: "compact", rowHeightPx: 70 })).toBe(70);
    expect(clampRowHeight(5)).toBe(24);
    expect(clampRowHeight(999)).toBe(240);
    expect(clampRowHeight(41.6)).toBe(42);
  });
});
