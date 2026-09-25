"use client";

import { LogOutIcon, UserMinusIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { initialsOf } from "@/lib/initials";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  type AssignableRole,
  type WorkspaceRole,
} from "@/lib/auth/roles";

import { leaveWorkspace, removeMember, updateMemberRole } from "./actions";

export interface MemberRow {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
  joined: string;
}

const ROLE_ITEMS = ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export function MembersTable({
  slug,
  members,
  currentUserId,
  isAdmin,
}: {
  slug: string;
  members: MemberRow[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-muted hover:bg-surface-muted">
            <TableHead>Member</TableHead>
            <TableHead className="w-36">Role</TableHead>
            <TableHead className="w-32">Joined</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            const canEdit = isAdmin && !isSelf && m.role !== "owner";
            return (
              <TableRow key={m.userId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarImage src={m.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback>{initialsOf(m.displayName, m.email)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {m.displayName || m.email}
                        {isSelf && (
                          <span className="ml-1.5 text-xs font-normal text-ink-muted">(you)</span>
                        )}
                      </p>
                      {m.displayName && (
                        <p className="truncate text-xs text-ink-muted">{m.email}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <RoleSelect slug={slug} userId={m.userId} role={m.role as AssignableRole} />
                  ) : (
                    <Badge variant={m.role === "owner" ? "default" : "outline"}>
                      {ROLE_LABELS[m.role]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-ink-secondary">{m.joined}</TableCell>
                <TableCell className="text-right">
                  {canEdit && <RemoveMemberButton slug={slug} member={m} />}
                  {isSelf && m.role !== "owner" && <LeaveButton slug={slug} />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RoleSelect({
  slug,
  userId,
  role,
}: {
  slug: string;
  userId: string;
  role: AssignableRole;
}) {
  const [value, setValue] = useState<AssignableRole>(role);
  const [pending, startTransition] = useTransition();

  function change(next: AssignableRole | null) {
    if (!next || next === value) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("role", next);
      const result = await updateMemberRole(slug, null, fd);
      if (result?.ok) toast.success(result.message);
      else {
        setValue(previous);
        toast.error(result?.error ?? "Couldn't update the role.");
      }
    });
  }

  return (
    <Select items={ROLE_ITEMS} value={value} onValueChange={change} disabled={pending}>
      <SelectTrigger size="sm" className="w-28" aria-label="Role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RemoveMemberButton({ slug, member }: { slug: string; member: MemberRow }) {
  const [pending, startTransition] = useTransition();
  const name = member.displayName || member.email;

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Remove ${name}`} disabled={pending} />
        }
      >
        <UserMinusIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They lose access to this workspace immediately. Their past updates and activity stay
            attributed to them. You can invite them again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                const fd = new FormData();
                fd.set("userId", member.userId);
                const result = await removeMember(slug, null, fd);
                if (result?.ok) toast.success(result.message);
                else toast.error(result?.error ?? "Couldn't remove the member.");
              })
            }
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LeaveButton({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Leave workspace" disabled={pending} />
        }
      >
        <LogOutIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave this workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll need a new invite link to get back in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                const result = await leaveWorkspace(slug);
                if (result && !result.ok) toast.error(result.error);
              })
            }
          >
            Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
