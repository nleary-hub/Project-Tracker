import { describe, expect, it } from "vitest";

import { inviteListStatus, inviteUrl } from "./invites";

describe("invites", () => {
  it("builds an absolute link", () => {
    expect(inviteUrl("https://tracker.example.com", "abc123")).toBe(
      "https://tracker.example.com/invite/abc123",
    );
  });

  it("derives list status with revoked taking precedence", () => {
    const now = new Date("2026-09-25T12:00:00Z");
    const base = { expires_at: "2026-10-01T00:00:00Z", accepted_at: null, revoked_at: null };
    expect(inviteListStatus(base, now)).toBe("active");
    expect(inviteListStatus({ ...base, expires_at: "2026-09-01T00:00:00Z" }, now)).toBe("expired");
    expect(inviteListStatus({ ...base, accepted_at: "2026-09-20T00:00:00Z" }, now)).toBe(
      "accepted",
    );
    expect(
      inviteListStatus(
        { ...base, accepted_at: "2026-09-20T00:00:00Z", revoked_at: "2026-09-21T00:00:00Z" },
        now,
      ),
    ).toBe("revoked");
  });
});
