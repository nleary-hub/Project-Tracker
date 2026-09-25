import Link from "next/link";

import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export function AppHeader({ workspaceSlug, appName }: { workspaceSlug: string; appName: string }) {
  return (
    <header className="bg-navy-900 text-white">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-stretch gap-6 px-4 md:px-6">
        <div className="flex items-center gap-2">
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
        </div>
        <nav aria-label="Main" className="hidden md:flex">
          <NavLinks workspaceSlug={workspaceSlug} />
        </nav>
        {/* Account menu arrives with sign-in in M1. */}
        <div className="ml-auto flex items-center" />
      </div>
    </header>
  );
}
