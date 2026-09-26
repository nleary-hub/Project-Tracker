import { describe, expect, it } from "vitest";

import { DEMO_DEPARTMENTS, DEMO_PEOPLE, DEMO_PROJECTS, demoDate, YOU } from "./demo-data";

const peopleNames = new Set<string>([...DEMO_PEOPLE.map((p) => p.name), YOU]);

describe("demo data", () => {
  it("only references the demo departments and people", () => {
    for (const p of DEMO_PROJECTS) {
      expect(DEMO_DEPARTMENTS).toContain(p.department);
      expect(peopleNames.has(p.owner)).toBe(true);
      for (const t of p.tasks) {
        if (t.assignee) expect(peopleNames.has(t.assignee)).toBe(true);
      }
    }
  });

  it("points every task milestone at a milestone in the same project", () => {
    for (const p of DEMO_PROJECTS) {
      const milestones = new Set(p.milestones.map((m) => m.name));
      for (const t of p.tasks) {
        if (t.milestone) expect(milestones.has(t.milestone)).toBe(true);
      }
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

  it("gives the loading admin some projects and open tasks", () => {
    expect(DEMO_PROJECTS.some((p) => p.owner === YOU)).toBe(true);
    const mine = DEMO_PROJECTS.flatMap((p) => p.tasks).filter(
      (t) => t.assignee === YOU && t.status !== "done",
    );
    expect(mine.length).toBeGreaterThan(0);
  });

  it("resolves offsets against today", () => {
    expect(demoDate("2026-09-25", -1)).toBe("2026-09-24");
    expect(demoDate("2026-09-25", null)).toBeNull();
  });
});
