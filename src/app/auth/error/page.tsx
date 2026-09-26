import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sign-in problem" };

export default async function AuthErrorPage({ searchParams }: PageProps<"/auth/error">) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "";

  return (
    <AuthShell
      title="Sign-in didn't complete"
      description="Google didn't return a valid sign-in. This usually happens when the window was closed early or the link was reused."
    >
      {reason && (
        <p className="mb-4 rounded-xl border border-border/80 bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground shadow-xs">
          {reason}
        </p>
      )}
      <Button render={<Link href="/login" />} nativeButton={false} className="w-full">
        Try again
      </Button>
    </AuthShell>
  );
}
