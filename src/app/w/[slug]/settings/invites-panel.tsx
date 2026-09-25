"use client";

import { CheckIcon, CopyIcon, LinkIcon, XIcon } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { type ActionState, fieldError } from "@/lib/action-result";
import {
  ASSIGNABLE_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type WorkspaceRole,
} from "@/lib/auth/roles";
import { INVITE_TTL_DAYS, type InviteListStatus, inviteUrl } from "@/lib/invites";

import { createInvite, revokeInvite } from "./actions";

export interface InviteRow {
  id: string;
  token: string;
  role: WorkspaceRole;
  label: string | null;
  status: InviteListStatus;
  expires: string;
  createdBy: string;
}

const ROLE_ITEMS = ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

const STATUS_LABEL: Record<InviteListStatus, string> = {
  active: "Active",
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
};

export function NewInviteDialog({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    async (prev: ActionState<{ token: string }>, formData: FormData) => {
      const result = await createInvite(slug, prev, formData);
      if (result?.ok && result.data) {
        setLink(inviteUrl(window.location.origin, result.data.token));
      } else if (result && !result.ok && !result.fieldErrors) {
        toast.error(result.error);
      }
      return result;
    },
    null,
  );

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setLink(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <LinkIcon />
        New invite link
      </DialogTrigger>
      <DialogContent>
        {link ? (
          <>
            <DialogHeader>
              <DialogTitle>Invite link ready</DialogTitle>
              <DialogDescription>
                Send this to one person. It works once and expires in {INVITE_TTL_DAYS} days.
              </DialogDescription>
            </DialogHeader>
            <CopyLink link={link} />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form action={action} noValidate>
            <DialogHeader>
              <DialogTitle>New invite link</DialogTitle>
              <DialogDescription>
                Each link admits one person. You&apos;ll copy it and send it yourself.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="my-4">
              <Field>
                <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                <Select name="role" items={ROLE_ITEMS} defaultValue="member">
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                        <span className="text-xs text-muted-foreground">
                          {ROLE_DESCRIPTIONS[item.value]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={Boolean(fieldError(state, "label"))}>
                <FieldLabel htmlFor="invite-label">Note (optional)</FieldLabel>
                <Input
                  id="invite-label"
                  name="label"
                  maxLength={80}
                  placeholder="e.g. Sam — Marketing"
                />
                <FieldDescription>
                  Only admins see this. Helps you remember who a link was for.
                </FieldDescription>
                {fieldError(state, "label") && (
                  <FieldError>{fieldError(state, "label")}</FieldError>
                )}
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create link"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="font-mono text-xs"
        aria-label="Invite link"
      />
      <Button type="button" variant="outline" onClick={copy} aria-label="Copy link">
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function InvitesTable({ slug, invites }: { slug: string; invites: InviteRow[] }) {
  if (invites.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-ink-secondary">
        No invite links yet. Create one to bring a teammate in.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-muted hover:bg-surface-muted">
            <TableHead>Link</TableHead>
            <TableHead className="w-24">Role</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-32">Expires</TableHead>
            <TableHead className="w-40">Created by</TableHead>
            <TableHead className="w-28 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map((invite) => (
            <TableRow
              key={invite.id}
              className={invite.status !== "active" ? "text-ink-muted" : undefined}
            >
              <TableCell className="font-medium">
                {invite.label ?? <span className="font-normal text-ink-muted">Untitled link</span>}
              </TableCell>
              <TableCell>{ROLE_LABELS[invite.role]}</TableCell>
              <TableCell>
                <Badge variant={invite.status === "active" ? "secondary" : "outline"}>
                  {STATUS_LABEL[invite.status]}
                </Badge>
              </TableCell>
              <TableCell>{invite.expires}</TableCell>
              <TableCell className="truncate">{invite.createdBy}</TableCell>
              <TableCell className="text-right">
                {invite.status === "active" && (
                  <div className="flex justify-end gap-1">
                    <CopyInviteButton token={invite.token} />
                    <RevokeInviteButton slug={slug} inviteId={invite.id} />
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CopyInviteButton({ token }: { token: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Copy invite link"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(inviteUrl(window.location.origin, token));
          toast.success("Link copied.");
        } catch {
          toast.error("Couldn't copy the link.");
        }
      }}
    >
      <CopyIcon />
    </Button>
  );
}

function RevokeInviteButton({ slug, inviteId }: { slug: string; inviteId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Revoke invite link"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const fd = new FormData();
          fd.set("inviteId", inviteId);
          const result = await revokeInvite(slug, null, fd);
          if (result?.ok) toast.success(result.message);
          else toast.error(result?.error ?? "Couldn't revoke the link.");
        })
      }
    >
      <XIcon />
    </Button>
  );
}
