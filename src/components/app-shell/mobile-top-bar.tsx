"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AccountMenu } from "@/components/app-shell/account-menu";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Profile } from "@/lib/auth/dal";

import { NavLinks } from "./nav-links";

/** Phone and small-tablet header: menu sheet, workspace name, account. */
export function MobileTopBar({
  appName,
  workspace,
  profile,
}: {
  appName: string;
  workspace: { slug: string; name: string };
  profile: Profile;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" />}>
          <MenuIcon />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <BrandMark size={24} />
              {workspace.name}
            </SheetTitle>
          </SheetHeader>
          <nav aria-label="Main" className="px-2">
            <NavLinks workspaceSlug={workspace.slug} onNavigate={() => setOpen(false)} />
          </nav>
          <div className="mt-auto border-t border-sidebar-border p-3">
            <ThemeToggle className="w-full justify-between *:flex-1" />
          </div>
        </SheetContent>
      </Sheet>
      <Link
        href={`/w/${workspace.slug}`}
        className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground"
      >
        <BrandMark size={24} />
        <span className="truncate">{workspace.name}</span>
        <span className="sr-only">— {appName}</span>
      </Link>
      <div className="ml-auto">
        <AccountMenu profile={profile} compact />
      </div>
    </header>
  );
}
