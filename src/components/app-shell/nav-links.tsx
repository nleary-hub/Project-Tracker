"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { NAV_ITEMS, isActive, navHref } from "./nav-items";

/** Vertical nav list used inside the phone menu sheet. */
export function NavLinks({
  workspaceSlug,
  onNavigate,
}: {
  workspaceSlug: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, workspaceSlug, item.segment);
        const Icon = item.icon;
        return (
          <li key={item.label}>
            <Link
              href={navHref(workspaceSlug, item.segment)}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon
                className={cn("size-[18px]", active ? "text-brand" : "text-sidebar-foreground/70")}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
