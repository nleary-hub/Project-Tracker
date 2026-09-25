import { describe, expect, it } from "vitest";

import { isOverdue, nextMilestone, sortForDisplay } from "./milestones";

const m = (id: string, due: string | null, done = false, rank = "a0") => ({
  id,
  name: id,
  due_date: due,
  completed_at: done ? "2026-09-01T00:00:00Z" : null,
  rank,
});

describe("nextMilestone", () => {
  it("picks the earliest incomplete milestone by due date", () => {
    const next = nextMilestone([
      m("late", "2026-12-01"),
      m("soon", "2026-10-01"),
      m("done", "2026-09-01", true),
    ]);
    expect(next?.id).toBe("soon");
  });

  it("puts undated milestones after dated ones and falls back to rank", () => {
    expect(nextMilestone([m("undated", null, false, "a0"), m("dated", "2026-11-01")])?.id).toBe(
      "dated",
    );
    expect(nextMilestone([m("b", null, false, "a1"), m("a", null, false, "a0")])?.id).toBe("a");
  });

  it("returns null when everything is complete", () => {
    expect(nextMilestone([m("x", "2026-10-01", true)])).toBeNull();
    expect(nextMilestone([])).toBeNull();
  });
});

describe("sortForDisplay", () => {
  it("lists open milestones by due date, then completed ones", () => {
    const rows = sortForDisplay([
      m("done", "2026-01-01", true),
      m("b", "2026-11-01"),
      m("a", "2026-10-01"),
      m("z", null),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "z", "done"]);
  });
});

describe("isOverdue", () => {
  it("is true only for open milestones due before today", () => {
    expect(isOverdue(m("x", "2026-09-24"), "2026-09-25")).toBe(true);
    expect(isOverdue(m("x", "2026-09-25"), "2026-09-25")).toBe(false);
    expect(isOverdue(m("x", "2026-09-01", true), "2026-09-25")).toBe(false);
    expect(isOverdue(m("x", null), "2026-09-25")).toBe(false);
  });
});
