import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { getMyWorkspaces, getProfile } from "@/lib/auth/dal";
import { requestOrigin } from "@/lib/request-origin";

import { CreateWorkspaceForm } from "./create-workspace-form";

export const metadata: Metadata = { title: "Set up your workspace" };

export default async function OnboardingPage() {
  const [profile, workspaces, origin] = await Promise.all([
    getProfile(),
    getMyWorkspaces(),
    requestOrigin(),
  ]);
  if (workspaces.length > 0) redirect(`/w/${workspaces[0].slug}`);

  const firstName = profile.display_name.split(" ")[0];

  return (
    <AuthShell
      title={firstName ? `Welcome, ${firstName}` : "Welcome"}
      description={
        <>
          Create the workspace your team will track projects in. If someone already set one up, ask
          them for an invite link instead — you&apos;re signed in as{" "}
          <span className="font-medium text-foreground">{profile.email}</span>.
        </>
      }
    >
      <CreateWorkspaceForm origin={origin.replace(/^https?:\/\//, "")} />
    </AuthShell>
  );
}
