import { describe, expect, it } from "vitest";

import { arrayMove, rankForMove, ranksForOrder } from "./reorder";

const rows = [
  { id: "a", rank: "a0" },
  { id: "b", rank: "a1" },
  { id: "c", rank: "a2" },
  { id: "d", rank: "a3" },
];

describe("rankForMove", () => {
  it("places a row between its new neighbours", () => {
    const rank = rankForMove(rows, "d", 1); // d goes between a and b
    expect(rank > "a0" && rank < "a1").toBe(true);
  });

  it("handles moving to the ends", () => {
    expect(rankForMove(rows, "c", 0) < "a0").toBe(true);
    expect(rankForMove(rows, "a", 3) > "a3").toBe(true);
  });

  it("only ever changes the moved row", () => {
    const rank = rankForMove(rows, "a", 2);
    const reordered = [...rows.filter((r) => r.id !== "a"), { id: "a", rank }].sort((x, y) =>
      x.rank < y.rank ? -1 : 1,
    );
    expect(reordered.map((r) => r.id)).toEqual(["b", "c", "a", "d"]);
  });
});

describe("ranksForOrder", () => {
  it("produces strictly increasing ranks in the given order", () => {
    const ranked = ranksForOrder(["x", "y", "z"]);
    expect(ranked.map((r) => r.id)).toEqual(["x", "y", "z"]);
    expect(ranked[0].rank < ranked[1].rank && ranked[1].rank < ranked[2].rank).toBe(true);
  });
});

describe("arrayMove", () => {
  it("moves forwards and backwards", () => {
    expect(arrayMove([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
    expect(arrayMove([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
  });
});
