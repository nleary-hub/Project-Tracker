import { AccountMenu } from "@/components/app-shell/account-menu";
import { AppHeader } from "@/components/app-shell/app-header";
import { APP_NAME } from "@/lib/app-config";
import { getMyWorkspaces, getProfile, requireWorkspace } from "@/lib/auth/dal";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  const [ctx, profile, workspaces] = await Promise.all([
    requireWorkspace(slug),
    getProfile(),
    getMyWorkspaces(),
  ]);

  return (
    <>
      <AppHeader
        workspaceSlug={ctx.workspace.slug}
        workspaceName={ctx.workspace.name}
        appName={APP_NAME}
        accountMenu={
          <AccountMenu profile={profile} workspaces={workspaces} currentSlug={ctx.workspace.slug} />
        }
      />
      <main className="flex-1">{children}</main>
    </>
  );
}
