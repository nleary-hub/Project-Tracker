"use server";

import { redirect } from "next/navigation";

import { type ActionState, fail } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/dal";
import { INVITE_PREVIEW_MESSAGES } from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

const RPC_ERRORS: Record<string, string> = {
  invite_not_found: INVITE_PREVIEW_MESSAGES.not_found,
  invite_revoked: INVITE_PREVIEW_MESSAGES.revoked,
  invite_used: INVITE_PREVIEW_MESSAGES.used,
  invite_expired: INVITE_PREVIEW_MESSAGES.expired,
};

export async function acceptInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const token = formData.get("token");
  if (typeof token !== "string" || !token) return fail(INVITE_PREVIEW_MESSAGES.not_found);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) {
    return fail(RPC_ERRORS[error.message] ?? "Couldn't accept the invite. Please try again.");
  }
  redirect(`/w/${data.slug}`);
}
