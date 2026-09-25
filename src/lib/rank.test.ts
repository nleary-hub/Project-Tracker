import { describe, expect, it } from "vitest";

import { byRank, rankAfter, rankBetween } from "./rank";

describe("rank", () => {
  it("appends in increasing text order", () => {
    const r1 = rankAfter(null);
    const r2 = rankAfter(r1);
    const r3 = rankAfter(r2);
    expect([r3, r1, r2].sort()).toEqual([r1, r2, r3]);
  });

  it("inserts between two ranks without touching neighbours", () => {
    const a = rankAfter(null);
    const c = rankAfter(a);
    const b = rankBetween(a, c);
    expect(a < b && b < c).toBe(true);
  });

  it("sorts rows by rank", () => {
    const rows = [{ rank: "a2" }, { rank: "a0" }, { rank: "a1" }];
    expect(rows.sort(byRank).map((r) => r.rank)).toEqual(["a0", "a1", "a2"]);
  });
});
