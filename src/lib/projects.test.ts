import { describe, expect, it } from "vitest";

import { addDays, todayInTimezone } from "./projects";

describe("dates", () => {
  it("formats today in the workspace timezone as YYYY-MM-DD", () => {
    // 03:30 UTC on the 25th is still the 24th in New York.
    const now = new Date("2026-09-25T03:30:00Z");
    expect(todayInTimezone("America/New_York", now)).toBe("2026-09-24");
    expect(todayInTimezone("UTC", now)).toBe("2026-09-25");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-09-25", 7)).toBe("2026-10-02");
    expect(addDays("2026-12-30", 5)).toBe("2027-01-04");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
