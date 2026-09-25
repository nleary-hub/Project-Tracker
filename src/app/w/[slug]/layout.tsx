import { AppHeader } from "@/components/app-shell/app-header";
import { APP_NAME } from "@/lib/app-config";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  return (
    <>
      <AppHeader workspaceSlug={slug} appName={APP_NAME} />
      <main className="flex-1">{children}</main>
    </>
  );
}
