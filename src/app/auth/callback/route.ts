import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

/** OAuth PKCE callback: exchanges the code for a session cookie, then continues to `next`. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Behind Vercel the request origin is the internal host; prefer the forwarded one.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const base =
        process.env.NODE_ENV === "development" || !forwardedHost
          ? origin
          : `https://${forwardedHost}`;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  const reason = searchParams.get("error_description") ?? searchParams.get("error") ?? "";
  return NextResponse.redirect(`${origin}/auth/error?reason=${encodeURIComponent(reason)}`);
}
