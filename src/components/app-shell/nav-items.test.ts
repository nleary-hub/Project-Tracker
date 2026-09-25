import { describe, expect, it } from "vitest";

import { isActive, navHref } from "./nav-items";

describe("navigation", () => {
  it("builds workspace-scoped links", () => {
    expect(navHref("acme", "")).toBe("/w/acme");
    expect(navHref("acme", "projects")).toBe("/w/acme/projects");
  });

  it("matches the dashboard exactly and sections by prefix", () => {
    expect(isActive("/w/acme", "acme", "")).toBe(true);
    expect(isActive("/w/acme/projects", "acme", "")).toBe(false);
    expect(isActive("/w/acme/projects/123", "acme", "projects")).toBe(true);
    expect(isActive("/w/acme/projectsx", "acme", "projects")).toBe(false);
  });
});
