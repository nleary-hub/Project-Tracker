"use client";

import { LogOutIcon, MoreHorizontalIcon } from "lucide-react";
import { useTransition } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import type { Profile } from "@/lib/auth/dal";
import { initialsOf } from "@/lib/initials";
import { cn } from "@/lib/utils";

/**
 * Who's signed in, with sign-out. `compact` shows only the avatar (collapsed
 * sidebar and the phone top bar); otherwise the name and email sit beside it.
 */
export function AccountMenu({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  const name = profile.display_name || profile.email;

  const avatar = (
    <Avatar size="sm" className="ring-1 ring-border">
      <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
      <AvatarFallback className="bg-brand-soft text-[11px] font-semibold text-brand">
        {initialsOf(profile.display_name, profile.email)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          compact ? (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full aria-expanded:bg-sidebar-accent/60"
              aria-label="Account menu"
            />
          ) : (
            <button
              type="button"
              aria-label="Account menu"
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors outline-none hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring/60 aria-expanded:bg-sidebar-accent/60",
              )}
            />
          )
        }
      >
        {avatar}
        {!compact && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-medium text-foreground">{name}</span>
              {profile.display_name && (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {profile.email}
                </span>
              )}
            </span>
            <MoreHorizontalIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={compact ? "end" : "start"}
        side={compact ? "right" : "top"}
        className="w-64"
      >
        <div className="flex items-center gap-2.5 px-1.5 py-1.5">
          {avatar}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            {profile.display_name && (
              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
            )}
          </div>
        </div>
        {compact && (
          <div className="px-1.5 pb-1.5">
            <ThemeToggle className="w-full justify-between *:flex-1" />
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onClick={() => startTransition(() => signOut())}>
          <LogOutIcon />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
