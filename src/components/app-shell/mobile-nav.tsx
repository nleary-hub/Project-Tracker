"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { NavLinks } from "./nav-links";

export function MobileNav({ workspaceSlug, appName }: { workspaceSlug: string; appName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-white/90 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Open menu"
          />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 border-sidebar-border bg-sidebar text-sidebar-foreground [&_[data-slot=sheet-close]]:text-white/80 [&_[data-slot=sheet-close]]:hover:bg-white/10 [&_[data-slot=sheet-close]]:hover:text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-sm font-semibold tracking-[0.12em] text-white uppercase">
            {appName}
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Main" className="px-2">
          <NavLinks
            workspaceSlug={workspaceSlug}
            orientation="vertical"
            onNavigate={() => setOpen(false)}
          />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
