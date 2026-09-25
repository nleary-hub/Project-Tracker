import { describe, expect, it } from "vitest";

import { DEMO_DEPARTMENTS, DEMO_PROJECTS, demoDate } from "./demo-data";

describe("demo data", () => {
  it("only references the demo departments", () => {
    for (const p of DEMO_PROJECTS) {
      expect(DEMO_DEPARTMENTS).toContain(p.department);
    }
  });

  it("keeps start before due and has unique names", () => {
    const names = new Set(DEMO_PROJECTS.map((p) => p.name));
    expect(names.size).toBe(DEMO_PROJECTS.length);
    for (const p of DEMO_PROJECTS) {
      if (p.startInDays !== null && p.dueInDays !== null) {
        expect(p.startInDays).toBeLessThanOrEqual(p.dueInDays);
      }
    }
  });

  it("covers overdue, imminent and comfortable open milestones", () => {
    const open = DEMO_PROJECTS.flatMap((p) => p.milestones).filter(
      (m) => !m.completed && m.dueInDays !== null,
    );
    expect(open.some((m) => m.dueInDays! < 0)).toBe(true);
    expect(open.some((m) => m.dueInDays! >= 0 && m.dueInDays! <= 7)).toBe(true);
    expect(open.some((m) => m.dueInDays! > 7)).toBe(true);
  });

  it("resolves offsets against today", () => {
    expect(demoDate("2026-09-25", -1)).toBe("2026-09-24");
    expect(demoDate("2026-09-25", null)).toBeNull();
  });
});
