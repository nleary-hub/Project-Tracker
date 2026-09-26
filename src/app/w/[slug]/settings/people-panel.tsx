"use client";

import { PencilIcon, Trash2Icon, UserPlusIcon } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";

import { NewPersonDialog } from "@/components/person-select";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type ActionState, fieldError } from "@/lib/action-result";

import { deletePerson, updatePerson } from "../people-actions";

export interface PersonRow {
  id: string;
  name: string;
  email: string | null;
  member: boolean;
  isDemo: boolean;
  /** Projects + milestones + tasks that name this person. */
  references: number;
}

/**
 * The workspace directory (docs/PLAN.md D31). Members appear automatically and
 * follow their own profile; everyone else can be edited or removed by an admin.
 */
export function PeoplePanel({
  slug,
  people,
  isAdmin,
}: {
  slug: string;
  people: PersonRow[];
  isAdmin: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const external = people.filter((p) => !p.member);
  const members = people.filter((p) => p.member);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "member" : "members"} and {external.length}{" "}
          {external.length === 1 ? "person" : "people"} who don&apos;t sign in.
        </p>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <UserPlusIcon />
          Add someone
        </Button>
        <NewPersonDialog
          slug={slug}
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreated={() => undefined}
        />
      </div>

      {people.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Nobody yet.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                  {p.member ? (
                    <Badge variant="secondary">Member</Badge>
                  ) : (
                    p.isDemo && <Badge variant="outline">Demo</Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {p.email ?? "No email"}
                  {p.references > 0 && (
                    <>
                      {" · "}
                      {p.references} {p.references === 1 ? "assignment" : "assignments"}
                    </>
                  )}
                </p>
              </div>
              {isAdmin && !p.member && (
                <div className="flex gap-1">
                  <EditPersonDialog slug={slug} person={p} />
                  <DeletePersonButton slug={slug} person={p} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditPersonDialog({ slug, person }: { slug: string; person: PersonRow }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email ?? "");
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await updatePerson(slug, person.id, prev, formData);
    if (result?.ok) {
      toast.success(result.message);
      setOpen(false);
    } else if (result && !result.fieldErrors) {
      toast.error(result.error);
    }
    return result;
  }, null);
  const nameError = fieldError(state, "name");
  const emailError = fieldError(state, "email");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Edit ${person.name}`} />}
      >
        <PencilIcon />
      </DialogTrigger>
      <DialogContent>
        <form action={action} noValidate>
          <DialogHeader>
            <DialogTitle>Edit person</DialogTitle>
            <DialogDescription>
              The name shows wherever they&apos;re an owner or assignee, including past reports.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="my-4 gap-3">
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor={`person-name-${person.id}`}>Name</FieldLabel>
              <Input
                id={`person-name-${person.id}`}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                autoFocus
                aria-invalid={Boolean(nameError)}
              />
              {nameError && <FieldError>{nameError}</FieldError>}
            </Field>
            <Field data-invalid={Boolean(emailError)}>
              <FieldLabel htmlFor={`person-email-${person.id}`}>Email (optional)</FieldLabel>
              <Input
                id={`person-email-${person.id}`}
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                aria-invalid={Boolean(emailError)}
              />
              {emailError && <FieldError>{emailError}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePersonButton({ slug, person }: { slug: string; person: PersonRow }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${person.name}`}
            disabled={pending}
          />
        }
      >
        <Trash2Icon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {person.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {person.references > 0
              ? `${person.references} ${person.references === 1 ? "item" : "items"} currently name them as owner or assignee and will become unassigned. Past reports keep the name.`
              : "Nothing currently names them, so nothing else changes."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                const result = await deletePerson(slug, person.id);
                if (result?.ok) toast.success(result.message);
                else toast.error(result?.error ?? "Couldn't remove that person.");
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
