import { describe, expect, it } from "vitest";

import { MilestoneSchema, ProjectSchema } from "./project";

const dept = "11111111-1111-4111-8111-111111111111";

describe("ProjectSchema", () => {
  it("accepts a minimal project and normalizes empty optionals", () => {
    const r = ProjectSchema.safeParse({
      name: " ERP upgrade ",
      departmentId: dept,
      ownerId: "",
      status: "active",
      startDate: "",
      dueDate: "",
      description: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("ERP upgrade");
      expect(r.data.ownerId).toBeNull();
      expect(r.data.startDate).toBeNull();
    }
  });

  it("rejects a due date before the start date", () => {
    const r = ProjectSchema.safeParse({
      name: "X",
      departmentId: dept,
      status: "active",
      startDate: "2026-10-10",
      dueDate: "2026-10-01",
      description: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["dueDate"]);
  });

  it("rejects an unknown status and a missing department", () => {
    expect(ProjectSchema.safeParse({ name: "X", departmentId: dept, status: "done" }).success).toBe(
      false,
    );
    expect(ProjectSchema.safeParse({ name: "X", departmentId: "", status: "active" }).success).toBe(
      false,
    );
  });
});

describe("MilestoneSchema", () => {
  it("allows undated milestones", () => {
    expect(MilestoneSchema.safeParse({ name: "Launch", dueDate: "", ownerId: "" }).success).toBe(
      true,
    );
    expect(MilestoneSchema.safeParse({ name: "", dueDate: "", ownerId: "" }).success).toBe(false);
  });
});
