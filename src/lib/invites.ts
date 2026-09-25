/** Invite links (docs/PLAN.md D2): single-use, copied by an admin, valid 7 days. */
export const INVITE_TTL_DAYS = 7;

export function inviteUrl(origin: string, token: string): string {
  return new URL(`/invite/${encodeURIComponent(token)}`, origin).toString();
}

export type InviteListStatus = "active" | "accepted" | "revoked" | "expired";

export function inviteListStatus(
  invite: { expires_at: string; accepted_at: string | null; revoked_at: string | null },
  now: Date = new Date(),
): InviteListStatus {
  if (invite.revoked_at) return "revoked";
  if (invite.accepted_at) return "accepted";
  if (new Date(invite.expires_at).getTime() < now.getTime()) return "expired";
  return "active";
}

/** Status returned by the `invite_preview` RPC for the landing page. */
export type InvitePreviewStatus =
  "valid" | "expired" | "revoked" | "used" | "not_found" | "already_member";

export const INVITE_PREVIEW_MESSAGES: Record<Exclude<InvitePreviewStatus, "valid">, string> = {
  expired: "This invite link has expired. Ask an admin for a new one.",
  revoked: "This invite link was revoked. Ask an admin for a new one.",
  used: "This invite link has already been used. Ask an admin for a new one.",
  not_found: "This invite link isn't valid. Check that you copied the whole link.",
  already_member: "You're already a member of this workspace.",
};
