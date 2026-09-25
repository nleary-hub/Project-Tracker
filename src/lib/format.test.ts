import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "./format";

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
