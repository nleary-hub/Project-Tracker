"use client";

import { CheckIcon, ChevronsUpDownIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AccountMenu } from "@/components/app-shell/account-menu";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Profile, WorkspaceSummary } from "@/lib/auth/dal";
import { initialsOf } from "@/lib/initials";
import { cn } from "@/lib/utils";

import { NAV_ITEMS, isActive, navHref } from "./nav-items";
import { writeSidebarCollapsed } from "./sidebar-state";

export interface SidebarProps {
  appName: string;
  workspace: { slug: string; name: string };
  workspaces: WorkspaceSummary[];
  profile: Profile;
  initialCollapsed: boolean;
}

/**
 * Desktop navigation rail. Expanded it shows labels; collapsed it keeps icons
 * with tooltips. The active item's background slides between links.
 */
export function AppSidebar({
  appName,
  workspace,
  workspaces,
  profile,
  initialCollapsed,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    writeSidebarCollapsed(next);
  }

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out-quart md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center", collapsed ? "justify-center px-2" : "px-3")}>
        <WorkspaceSwitcher
          appName={appName}
          workspace={workspace}
          workspaces={workspaces}
          collapsed={collapsed}
        />
      </div>

      <nav aria-label="Main" className="flex-1 px-2 pt-2">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, workspace.slug, item.segment);
            const Icon = item.icon;
            const link = (
              <Link
                href={navHref(workspace.slug, item.segment)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/nav relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  collapsed && "justify-center px-0",
                  active
                    ? "text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {active &&
                  (reduceMotion ? (
                    <span className="absolute inset-0 rounded-lg bg-sidebar-accent" />
                  ) : (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-sidebar-accent"
                      transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.8 }}
                    />
                  ))}
                <Icon
                  className={cn(
                    "relative size-[18px] shrink-0 transition-colors",
                    active
                      ? "text-brand"
                      : "text-sidebar-foreground/70 group-hover/nav:text-sidebar-accent-foreground",
                  )}
                  aria-hidden="true"
                />
                {!collapsed && <span className="relative truncate">{item.label}</span>}
              </Link>
            );
            return (
              <li key={item.label}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger render={link} />
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={cn(
          "flex flex-col gap-2 border-t border-sidebar-border p-2",
          collapsed && "items-center",
        )}
      >
        {!collapsed && <ThemeToggle className="w-full justify-between *:flex-1" />}
        <div className={cn("flex items-center gap-1", collapsed ? "flex-col" : "justify-between")}>
          <AccountMenu profile={profile} compact={collapsed} />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-pressed={collapsed}
                  onClick={toggle}
                  className="text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
                />
              }
            >
              {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
            </TooltipTrigger>
            <TooltipContent side="right">{collapsed ? "Expand" : "Collapse"}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}

function WorkspaceSwitcher({
  appName,
  workspace,
  workspaces,
  collapsed,
}: {
  appName: string;
  workspace: { slug: string; name: string };
  workspaces: WorkspaceSummary[];
  collapsed: boolean;
}) {
  const trigger = (
    <button
      type="button"
      aria-label={`${appName} — ${workspace.name}. Switch workspace`}
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-lg text-left transition-colors outline-none hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring/60 aria-expanded:bg-sidebar-accent/60",
        collapsed ? "size-10 justify-center" : "h-10 w-full px-1.5",
      )}
    >
      <BrandMark size={28} />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-foreground">
              {workspace.name}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">{appName}</span>
          </span>
          <ChevronsUpDownIcon
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </>
      )}
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="start" sideOffset={6} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} render={<Link href={`/w/${w.slug}`} />}>
              <span className="flex size-6 items-center justify-center rounded-md bg-brand-soft text-[11px] font-semibold text-brand">
                {initialsOf(w.name, w.slug)}
              </span>
              <span className="truncate">{w.name}</span>
              {w.slug === workspace.slug && <CheckIcon className="ml-auto text-brand" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={`/w/${workspace.slug}/settings`} />}>
          Workspace settings
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/onboarding" />}>Create a workspace</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
