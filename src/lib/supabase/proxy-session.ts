import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "./env";

/** Routes that work without a session. Everything else redirects to /login. */
const PUBLIC_PREFIXES = ["/login", "/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session cookie on every request and performs the
 * optimistic signed-in check. Real authorization happens in the data layer
 * (src/lib/auth/dal.ts) and in the database's RLS policies.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([k, v]) => supabaseResponse.headers.set(k, v));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): the call is
  // what refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && !isPublicPath(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (signedIn && pathname === "/login") {
    const next = request.nextUrl.searchParams.get("next");
    const home = request.nextUrl.clone();
    home.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return supabaseResponse;
}
