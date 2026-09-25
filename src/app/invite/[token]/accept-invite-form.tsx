"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { acceptInvite } from "./actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvite, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Joining…" : "Accept invite"}
      </Button>
      <Button variant="ghost" render={<Link href="/" />} nativeButton={false}>
        Not now
      </Button>
    </form>
  );
}
