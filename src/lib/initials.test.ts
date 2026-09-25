import { describe, expect, it } from "vitest";

import { initialsOf } from "./initials";

describe("initialsOf", () => {
  it("uses first and last name", () => {
    expect(initialsOf("Riley Lee", "riley@example.com")).toBe("RL");
  });

  it("falls back to the email when there is no name", () => {
    expect(initialsOf("", "riley.lee@example.com")).toBe("RL");
    expect(initialsOf("  ", "ops@example.com")).toBe("OE");
  });
});
