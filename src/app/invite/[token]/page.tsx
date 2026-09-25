import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { INVITE_PREVIEW_MESSAGES, type InvitePreviewStatus } from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

import { AcceptInviteForm } from "./accept-invite-form";

export const metadata: Metadata = { title: "Workspace invite" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data } = await supabase.rpc("invite_preview", { p_token: token });
  const preview = data?.[0];
  const status = (preview?.status ?? "not_found") as InvitePreviewStatus;

  if (status === "valid" && preview) {
    return (
      <AuthShell
        title={`Join ${preview.workspace_name}`}
        description={
          <>
            You&apos;ve been invited as {article(ROLE_LABELS[preview.role])}{" "}
            <span className="font-medium text-ink">{ROLE_LABELS[preview.role].toLowerCase()}</span>.
            You&apos;ll join as <span className="font-medium text-ink">{profile.email}</span>.
          </>
        }
      >
        <AcceptInviteForm token={token} />
      </AuthShell>
    );
  }

  if (status === "already_member" && preview) {
    return (
      <AuthShell
        title={preview.workspace_name}
        description={INVITE_PREVIEW_MESSAGES.already_member}
      >
        <Button
          size="lg"
          className="w-full"
          render={<Link href={`/w/${preview.workspace_slug}`} />}
          nativeButton={false}
        >
          Open workspace
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="This invite can't be used"
      description={INVITE_PREVIEW_MESSAGES[status === "valid" ? "not_found" : status]}
    >
      <Button variant="outline" className="w-full" render={<Link href="/" />} nativeButton={false}>
        Go to my workspace
      </Button>
    </AuthShell>
  );
}

function article(word: string) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}
