import { describe, expect, it } from "vitest";

import { isOpenTask, isTaskOverdue, prioritySortKey, TASK_PRIORITIES } from "./tasks";

describe("tasks", () => {
  it("treats everything but done as open", () => {
    expect(isOpenTask({ status: "todo" })).toBe(true);
    expect(isOpenTask({ status: "blocked" })).toBe(true);
    expect(isOpenTask({ status: "done" })).toBe(false);
  });

  it("flags overdue only for open, dated tasks in the past", () => {
    const today = "2026-09-26";
    expect(isTaskOverdue({ status: "todo", due_date: "2026-09-25" }, today)).toBe(true);
    expect(isTaskOverdue({ status: "todo", due_date: "2026-09-26" }, today)).toBe(false);
    expect(isTaskOverdue({ status: "done", due_date: "2026-09-01" }, today)).toBe(false);
    expect(isTaskOverdue({ status: "todo", due_date: null }, today)).toBe(false);
  });

  it("orders priorities low → urgent by sort key", () => {
    const keys = TASK_PRIORITIES.map(prioritySortKey);
    expect([...keys].sort()).toEqual(keys);
  });
});
