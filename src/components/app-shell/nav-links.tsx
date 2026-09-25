"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { NAV_ITEMS, isActive, navHref } from "./nav-items";

export function NavLinks({
  workspaceSlug,
  orientation = "horizontal",
  onNavigate,
}: {
  workspaceSlug: string;
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";

  return (
    <ul className={cn("flex", vertical ? "flex-col gap-1" : "items-stretch gap-1")}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, workspaceSlug, item.segment);
        const Icon = item.icon;
        return (
          <li key={item.label} className="flex">
            <Link
              href={navHref(workspaceSlug, item.segment)}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                vertical ? "w-full rounded-sm px-3 py-2" : "border-b-2 px-3 pt-0.5",
                active
                  ? vertical
                    ? "bg-white/10 text-white"
                    : "border-white text-white"
                  : vertical
                    ? "text-white/75 hover:bg-white/5 hover:text-white"
                    : "border-transparent text-white/75 hover:text-white",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
