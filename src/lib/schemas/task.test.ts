import { describe, expect, it } from "vitest";

import { TaskSchema, taskInputFromForm } from "./task";

describe("TaskSchema", () => {
  it("fills defaults and maps blanks to null", () => {
    const r = TaskSchema.safeParse({
      title: " Write the brief ",
      assigneeId: "unassigned",
      milestoneId: "",
      dueDate: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toMatchObject({
        title: "Write the brief",
        description: "",
        status: "todo",
        priority: "medium",
        assigneeId: null,
        milestoneId: null,
        dueDate: null,
      });
    }
  });

  it("rejects unknown statuses and bad dates", () => {
    expect(TaskSchema.safeParse({ title: "x", status: "later" }).success).toBe(false);
    expect(TaskSchema.safeParse({ title: "x", dueDate: "2026-13-40" }).success).toBe(false);
  });

  it("reads a form", () => {
    const fd = new FormData();
    fd.set("title", "Ship");
    fd.set("priority", "urgent");
    fd.set("status", "in_progress");
    const r = taskInputFromForm(fd);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.priority).toBe("urgent");
  });
});
