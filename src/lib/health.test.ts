import { describe, expect, it } from "vitest";

import { HEALTH_META, HEALTH_STATUSES, INACTIVE_STATUSES, healthMeta } from "./health";

describe("health vocabulary", () => {
  it("gives each active health status a distinct shape and color", () => {
    const shapes = HEALTH_STATUSES.map((s) => HEALTH_META[s].shape);
    const colors = HEALTH_STATUSES.map((s) => HEALTH_META[s].colorVar);
    expect(new Set(shapes).size).toBe(HEALTH_STATUSES.length);
    expect(new Set(colors).size).toBe(HEALTH_STATUSES.length);
  });

  it("draws inactive statuses as a neutral ring", () => {
    for (const s of INACTIVE_STATUSES) {
      expect(healthMeta(s)).toMatchObject({ shape: "ring", colorVar: "--health-inactive" });
    }
  });

  it("never reuses a health color for an inactive status", () => {
    const active = new Set(HEALTH_STATUSES.map((s) => HEALTH_META[s].colorVar));
    for (const s of INACTIVE_STATUSES) expect(active.has(HEALTH_META[s].colorVar)).toBe(false);
  });
});
