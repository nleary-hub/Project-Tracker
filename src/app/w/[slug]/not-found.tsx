import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function WorkspaceNotFound() {
  return (
    <AuthShell
      title="Workspace not found"
      description="There's no workspace at this address, or you're not a member of it. Ask an admin for an invite link if you should have access."
    >
      <Button className="w-full" render={<Link href="/" />} nativeButton={false}>
        Go to my workspace
      </Button>
    </AuthShell>
  );
}
