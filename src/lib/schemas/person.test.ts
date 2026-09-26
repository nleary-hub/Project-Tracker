import { describe, expect, it } from "vitest";

import { PersonSchema, personInputFromForm } from "./person";

describe("PersonSchema", () => {
  it("accepts a name alone and treats a blank email as null", () => {
    const r = PersonSchema.safeParse({ name: "  Dana Reyes ", email: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("Dana Reyes");
      expect(r.data.email).toBeNull();
    }
  });

  it("validates the email when given", () => {
    expect(PersonSchema.safeParse({ name: "Dana", email: "not-an-email" }).success).toBe(false);
    expect(PersonSchema.safeParse({ name: "Dana", email: "dana@example.com" }).success).toBe(true);
  });

  it("requires a name", () => {
    expect(PersonSchema.safeParse({ name: "   ", email: "" }).success).toBe(false);
  });

  it("reads form data with a missing email field", () => {
    const fd = new FormData();
    fd.set("name", "Priya");
    const r = personInputFromForm(fd);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBeNull();
  });
});
