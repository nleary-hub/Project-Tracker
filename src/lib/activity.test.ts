import { describe, expect, it } from "vitest";

import { activitySentence, describeActivity } from "./activity";

describe("describeActivity", () => {
  it("reads task and milestone events as sentences", () => {
    expect(
      activitySentence("Dana", { kind: "task_completed", payload: { title: "Ship it" } }),
    ).toBe("Dana completed the task Ship it");
    expect(
      activitySentence("Dana", {
        kind: "milestone_date_changed",
        payload: { name: "Launch", from: "2026-10-01", to: "2026-10-08" },
      }),
    ).toBe("Dana moved the milestone Launch from 2026-10-01 to 2026-10-08");
    expect(
      activitySentence("Dana", {
        kind: "task_status_changed",
        payload: { title: "Draft", from: "todo", to: "blocked" },
      }),
    ).toBe("Dana marked the task Draft Blocked (was To do)");
  });

  it("handles assignment and unassignment", () => {
    expect(
      activitySentence("Dana", { kind: "task_assigned", payload: { title: "Draft", to: "Priya" } }),
    ).toBe("Dana assigned the task Draft to Priya");
    expect(
      activitySentence("Dana", {
        kind: "task_assigned",
        payload: { title: "Draft", from: "Priya", to: null },
      }),
    ).toBe("Dana unassigned the task Draft from Priya");
  });

  it("uses the supplied date formatter and survives missing payload keys", () => {
    const t = describeActivity(
      { kind: "milestone_date_changed", payload: { name: "Launch", to: "2026-10-08" } },
      (d) => `<${d}>`,
    );
    expect(t.detail).toBe("to <2026-10-08>");
    expect(describeActivity({ kind: "task_deleted", payload: null }).subject).toBeNull();
  });

  it("describes project changes", () => {
    expect(
      activitySentence("Dana", {
        kind: "project_status_changed",
        payload: { name: "ERP", from: "active", to: "on_hold" },
      }),
    ).toBe("Dana changed the status from Active to On hold");
    expect(
      activitySentence("Dana", {
        kind: "project_owner_changed",
        payload: { name: "ERP", from: "Nick", to: "Priya" },
      }),
    ).toBe("Dana made Priya the owner (was Nick)");
  });
});
