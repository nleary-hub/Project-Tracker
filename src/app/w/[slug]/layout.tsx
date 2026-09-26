import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { MobileTopBar } from "@/components/app-shell/mobile-top-bar";
import { SIDEBAR_COOKIE, readSidebarCollapsed } from "@/components/app-shell/sidebar-state";
import { APP_NAME } from "@/lib/app-config";
import { getMyWorkspaces, getProfile, requireWorkspace } from "@/lib/auth/dal";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  const [ctx, profile, workspaces, cookieStore] = await Promise.all([
    requireWorkspace(slug),
    getProfile(),
    getMyWorkspaces(),
    cookies(),
  ]);
  const workspace = { slug: ctx.workspace.slug, name: ctx.workspace.name };

  return (
    <div className="flex min-h-svh w-full">
      <AppSidebar
        appName={APP_NAME}
        workspace={workspace}
        workspaces={workspaces}
        profile={profile}
        initialCollapsed={readSidebarCollapsed(cookieStore.get(SIDEBAR_COOKIE)?.value)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar appName={APP_NAME} workspace={workspace} profile={profile} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
