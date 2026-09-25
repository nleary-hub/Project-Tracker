"use client";

import { CheckIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { signOut } from "@/lib/auth/actions";
import type { Profile, WorkspaceSummary } from "@/lib/auth/dal";
import { initialsOf } from "@/lib/initials";

export function AccountMenu({
  profile,
  workspaces,
  currentSlug,
}: {
  profile: Profile;
  workspaces: WorkspaceSummary[];
  currentSlug: string;
}) {
  const [pending, startTransition] = useTransition();
  const name = profile.display_name || profile.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:bg-white/10 hover:text-white aria-expanded:bg-white/15 aria-expanded:text-white"
            aria-label="Account menu"
          />
        }
      >
        <Avatar size="sm">
          <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="bg-white/15 text-white">
            {initialsOf(profile.display_name, profile.email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-1.5 py-1.5">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          {profile.display_name && (
            <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          )}
        </div>
        {workspaces.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
              {workspaces.map((w) => (
                <DropdownMenuItem key={w.id} render={<Link href={`/w/${w.slug}`} />}>
                  <span className="truncate">{w.name}</span>
                  {w.slug === currentSlug && <CheckIcon className="ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
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
