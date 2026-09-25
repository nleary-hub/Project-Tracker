import { describe, expect, it } from "vitest";

import { isValidSlug, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases, collapses separators and trims hyphens", () => {
    expect(slugify("  Acme Corp — Ops!  ")).toBe("acme-corp-ops");
    expect(slugify("Q4__Campaign")).toBe("q4-campaign");
  });

  it("strips accents", () => {
    expect(slugify("Département Étude")).toBe("departement-etude");
  });

  it("caps at 40 characters without a dangling hyphen", () => {
    const slug = slugify("a".repeat(39) + " bcdef");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
    expect(isValidSlug(slug)).toBe(true);
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("");
    expect(isValidSlug("")).toBe(false);
  });

  it("validates against the database rule", () => {
    expect(isValidSlug("acme")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
    expect(isValidSlug("-acme")).toBe(false);
    expect(isValidSlug("acme-")).toBe(false);
    expect(isValidSlug("Acme")).toBe(false);
    expect(isValidSlug("a".repeat(41))).toBe(false);
  });
});
