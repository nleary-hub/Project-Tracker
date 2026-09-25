import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleMark } from "@/components/auth/google-mark";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth/actions";
import { safeNextPath } from "@/lib/request-origin";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <AuthShell
      title="Sign in"
      description="Use your Google account. If you were sent an invite link, sign in and you'll be taken straight to it."
    >
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" size="lg" variant="outline" className="w-full">
          <GoogleMark className="size-4" />
          Continue with Google
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </AuthShell>
  );
}
