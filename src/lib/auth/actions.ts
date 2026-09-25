"use server";

import { redirect } from "next/navigation";

import { requestOrigin, safeNextPath } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

/** Starts the Google OAuth (PKCE) flow; /auth/callback finishes it. */
export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const origin = await requestOrigin();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Could not start sign-in.")}`);
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
