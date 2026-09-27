import { describe, expect, it } from "vitest";

import { ProjectUpdateSchema, projectUpdateInputFromForm } from "./project-update";

describe("ProjectUpdateSchema", () => {
  it("trims the body and maps a blank next step to null", () => {
    const r = ProjectUpdateSchema.safeParse({ body: " Shipped the design. ", nextStep: "  " });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.body).toBe("Shipped the design.");
      expect(r.data.nextStep).toBeNull();
    }
  });

  it("rejects an empty body and an over-long next step", () => {
    expect(ProjectUpdateSchema.safeParse({ body: "   ", nextStep: null }).success).toBe(false);
    expect(ProjectUpdateSchema.safeParse({ body: "ok", nextStep: "x".repeat(501) }).success).toBe(
      false,
    );
  });

  it("reads a form, with or without the next step field", () => {
    const fd = new FormData();
    fd.set("body", "On track.");
    fd.set("nextStep", "Finalize the budget doc.");
    const r = projectUpdateInputFromForm(fd);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nextStep).toBe("Finalize the budget doc.");

    const bare = new FormData();
    bare.set("body", "On track.");
    const r2 = projectUpdateInputFromForm(bare);
    expect(r2.success).toBe(true);
    if (r2.success) expect(r2.data.nextStep).toBeNull();
  });
});
