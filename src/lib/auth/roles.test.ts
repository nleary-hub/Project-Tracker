import { describe, expect, it } from "vitest";

import { isAdminRole, isAssignableRole } from "./roles";

describe("roles", () => {
  it("treats owners and admins as admins", () => {
    expect(isAdminRole("owner")).toBe(true);
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("member")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });

  it("never lets ownership be assigned", () => {
    expect(isAssignableRole("admin")).toBe(true);
    expect(isAssignableRole("member")).toBe(true);
    expect(isAssignableRole("owner")).toBe(false);
    expect(isAssignableRole("root")).toBe(false);
  });
});
