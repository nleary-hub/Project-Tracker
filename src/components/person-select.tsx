"use client";

import { UserPlusIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPerson } from "@/app/w/[slug]/people-actions";
import type { ActionState } from "@/lib/action-result";
import { fieldError } from "@/lib/action-result";
import type { PersonOption } from "@/lib/people";
import { UNASSIGNED } from "@/lib/schemas/project";

const NEW_PERSON = "__new_person__";

/**
 * Picker for owners and assignees (docs/PLAN.md D31): lists everyone in the
 * workspace directory and lets the user add someone who isn't a member —
 * a department head who never signs in, for example — without leaving the form.
 */
export function PersonSelect({
  id,
  name,
  slug,
  people,
  value,
  onChange,
  allowCreate = true,
  className,
  "aria-invalid": ariaInvalid,
}: {
  id: string;
  /** Form field name; the selected person id (or "unassigned") is submitted under it. */
  name: string;
  slug: string;
  people: PersonOption[];
  value: string;
  onChange: (value: string) => void;
  allowCreate?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  // People added from this picker, so they can be selected before the page refreshes.
  const [added, setAdded] = useState<PersonOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const known = new Set(people.map((p) => p.value));
  const options = [...people, ...added.filter((p) => !known.has(p.value))];
  const items = [
    { value: UNASSIGNED, label: "Unassigned" },
    ...options,
    ...(allowCreate ? [{ value: NEW_PERSON, label: "Add someone…" }] : []),
  ];

  return (
    <>
      <Select
        name={name}
        items={items}
        value={value}
        onValueChange={(v) => {
          if (v === NEW_PERSON) {
            setDialogOpen(true);
            return;
          }
          if (typeof v === "string") onChange(v);
        }}
      >
        <SelectTrigger id={id} className={className ?? "w-full"} aria-invalid={ariaInvalid}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {options.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
          {allowCreate && (
            <>
              <SelectSeparator />
              <SelectItem value={NEW_PERSON}>
                <span className="flex items-center gap-2">
                  <UserPlusIcon className="size-4" />
                  Add someone…
                </span>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
      {allowCreate && (
        <NewPersonDialog
          slug={slug}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={(person) => {
            setAdded((list) => [...list, person]);
            onChange(person.value);
          }}
        />
      )}
    </>
  );
}

/**
 * Not a nested <form>: the dialog lives inside the surrounding form's React
 * tree, so it collects its fields by hand and calls the action directly.
 */
export function NewPersonDialog({
  slug,
  open,
  onOpenChange,
  onCreated,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (person: PersonOption) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ActionState<{ id: string; name: string }>>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setEmail("");
    setState(null);
  }

  function submit() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    startTransition(async () => {
      const result = await createPerson(slug, null, fd);
      setState(result);
      if (result?.ok && result.data) {
        toast.success(result.message);
        onCreated({ value: result.data.id, label: result.data.name, member: false });
        onOpenChange(false);
        reset();
      } else if (result && !result.ok && !result.fieldErrors) {
        toast.error(result.error);
      }
    });
  }

  const nameError = fieldError(state, "name");
  const emailError = fieldError(state, "email");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add someone</DialogTitle>
          <DialogDescription>
            For owners and assignees who don&apos;t sign in. They appear in reports by name; an
            email lets the tracker send them reminders later.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="my-4 gap-3">
          <Field data-invalid={Boolean(nameError)}>
            <FieldLabel htmlFor="new-person-name">Name</FieldLabel>
            <Input
              id="new-person-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              autoFocus
              placeholder="e.g. Dana Reyes"
              aria-invalid={Boolean(nameError)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            {nameError && <FieldError>{nameError}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(emailError)}>
            <FieldLabel htmlFor="new-person-email">Email (optional)</FieldLabel>
            <Input
              id="new-person-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              placeholder="name@company.com"
              aria-invalid={Boolean(emailError)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            {emailError && <FieldError>{emailError}</FieldError>}
            <FieldDescription>Members are added automatically when they join.</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Adding…" : "Add person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
