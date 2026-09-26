import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, timeAgo } from "./format";

describe("formatDate", () => {
  it("keeps a calendar date on the same day regardless of timezone", () => {
    expect(formatDate("2026-10-20", "America/New_York")).toBe("Oct 20, 2026");
    expect(formatDate("2026-10-20", "Pacific/Auckland")).toBe("Oct 20, 2026");
  });

  it("renders timestamps in the workspace timezone", () => {
    // 03:30 UTC on the 25th is the evening of the 24th in New York.
    expect(formatDate("2026-09-25T03:30:00Z", "America/New_York")).toBe("Sep 24, 2026");
    expect(formatDateTime("2026-09-25T03:30:00Z", "America/New_York")).toBe(
      "Sep 24, 2026, 11:30 PM",
    );
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-09-26T12:00:00Z");
  it("uses relative wording up to a week", () => {
    expect(timeAgo("2026-09-26T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-09-26T11:40:00Z", now)).toBe("20m ago");
    expect(timeAgo("2026-09-26T07:00:00Z", now)).toBe("5h ago");
    expect(timeAgo("2026-09-23T12:00:00Z", now)).toBe("3d ago");
  });
  it("falls back to the date after a week", () => {
    expect(timeAgo("2026-09-01T12:00:00Z", now)).toBe("Sep 1, 2026");
  });
});
