import Link from "next/link";

import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export function AppHeader({
  workspaceSlug,
  workspaceName,
  appName,
  accountMenu,
}: {
  workspaceSlug: string;
  workspaceName: string;
  appName: string;
  accountMenu: React.ReactNode;
}) {
  return (
    <header className="bg-navy-900 text-white">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-stretch gap-6 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <MobileNav workspaceSlug={workspaceSlug} appName={appName} />
          <Link
            href={`/w/${workspaceSlug}`}
            className="flex items-center gap-2 text-sm font-semibold tracking-[0.12em] uppercase"
          >
            <span
              aria-hidden="true"
              className="inline-block size-3 rotate-45 border border-white/60 bg-brand"
            />
            {appName}
          </Link>
          <span aria-hidden="true" className="hidden h-4 w-px bg-white/25 sm:block" />
          <span className="hidden truncate text-sm text-white/75 sm:block">{workspaceName}</span>
        </div>
        <nav aria-label="Main" className="hidden md:flex">
          <NavLinks workspaceSlug={workspaceSlug} />
        </nav>
        <div className="ml-auto flex items-center">{accountMenu}</div>
      </div>
    </header>
  );
}
