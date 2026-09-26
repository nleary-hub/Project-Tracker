"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

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
import { PersonSelect } from "@/components/person-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/lib/milestones";
import { type PersonOption, UNKNOWN_PERSON } from "@/lib/people";
import { UNASSIGNED } from "@/lib/schemas/project";
import { cn } from "@/lib/utils";

import {
  createMilestone,
  deleteMilestone,
  setMilestoneCompleted,
  updateMilestone,
} from "../actions";

export interface MilestoneItem {
  id: string;
  name: string;
  due_date: string | null;
  owner_id: string | null;
  completed_at: string | null;
  rank: string;
}

export function MilestonesPanel({
  slug,
  projectId,
  milestones,
  people,
  canEdit,
  today,
  timeZone,
}: {
  slug: string;
  projectId: string;
  /** Already sorted for display: open by due date, then completed. */
  milestones: MilestoneItem[];
  people: PersonOption[];
  canEdit: boolean;
  today: string;
  timeZone: string;
}) {
  const personName = new Map(people.map((p) => [p.value, p.label]));
  const nextId = milestones.find((m) => m.completed_at === null)?.id ?? null;
  const open = milestones.filter((m) => m.completed_at === null).length;

  return (
    <section aria-labelledby="milestones-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="milestones-heading" className="text-base font-semibold text-foreground">
          Milestones
        </h2>
        <span className="text-xs text-muted-foreground">
          {open} open · {milestones.length - open} done
        </span>
      </div>

      {milestones.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          No milestones yet. The earliest open milestone becomes the project&apos;s &ldquo;next
          step&rdquo; in every report.
        </p>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
          {milestones.map((m) => {
            const done = m.completed_at !== null;
            const overdue = isOverdue(m, today);
            return (
              <li
                key={m.id}
                className={cn("flex items-center gap-3 px-3 py-2", done && "text-muted-foreground")}
              >
                <CompleteToggle slug={slug} milestone={m} disabled={!canEdit} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        done ? "line-through" : "text-foreground",
                      )}
                    >
                      {m.name}
                    </span>
                    {m.id === nextId && <Badge variant="secondary">Next</Badge>}
                  </div>
                  <p className="text-xs">
                    {m.due_date ? (
                      <span className={cn(overdue && "font-medium text-health-off-track")}>
                        {overdue ? "Overdue · " : done ? "Was due " : "Due "}
                        {formatDate(m.due_date, timeZone)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No date</span>
                    )}
                    {m.owner_id && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {personName.get(m.owner_id) ?? UNKNOWN_PERSON}
                      </span>
                    )}
                    {done && m.completed_at && (
                      <span className="text-muted-foreground">
                        {" "}
                        · Completed {formatDate(m.completed_at, timeZone)}
                      </span>
                    )}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <EditMilestoneDialog slug={slug} milestone={m} people={people} />
                    <DeleteMilestoneButton slug={slug} milestone={m} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {canEdit && <AddMilestoneForm slug={slug} projectId={projectId} people={people} />}
    </section>
  );
}

function CompleteToggle({
  slug,
  milestone,
  disabled,
}: {
  slug: string;
  milestone: MilestoneItem;
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const checked = milestone.completed_at !== null;
  return (
    <Checkbox
      checked={checked}
      disabled={disabled || pending}
      aria-label={`${checked ? "Reopen" : "Complete"} ${milestone.name}`}
      onCheckedChange={(next) =>
        startTransition(async () => {
          const result = await setMilestoneCompleted(slug, milestone.id, Boolean(next));
          if (result?.ok) toast.success(result.message);
          else toast.error(result?.error ?? "Couldn't update the milestone.");
        })
      }
    />
  );
}

function MilestoneFields({
  idPrefix,
  slug,
  state,
  people,
  initial,
}: {
  idPrefix: string;
  slug: string;
  state: ActionState;
  people: PersonOption[];
  initial?: Pick<MilestoneItem, "name" | "due_date" | "owner_id">;
}) {
  // Controlled so a validation error doesn't wipe the typed values.
  const [name, setName] = useState(initial?.name ?? "");
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [ownerId, setOwnerId] = useState(initial?.owner_id ?? UNASSIGNED);
  const nameError = fieldError(state, "name");
  const dueError = fieldError(state, "dueDate");
  return (
    <FieldGroup className="gap-3">
      <Field data-invalid={Boolean(nameError)}>
        <FieldLabel htmlFor={`${idPrefix}-name`}>Milestone</FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
          placeholder="e.g. Design sign-off"
          aria-invalid={Boolean(nameError)}
        />
        {nameError && <FieldError>{nameError}</FieldError>}
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field data-invalid={Boolean(dueError)}>
          <FieldLabel htmlFor={`${idPrefix}-due`}>Due date</FieldLabel>
          <Input
            id={`${idPrefix}-due`}
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {dueError && <FieldError>{dueError}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-owner`}>Owner</FieldLabel>
          <PersonSelect
            id={`${idPrefix}-owner`}
            name="ownerId"
            slug={slug}
            people={people}
            value={ownerId}
            onChange={setOwnerId}
          />
        </Field>
      </div>
    </FieldGroup>
  );
}

function AddMilestoneForm({
  slug,
  projectId,
  people,
}: {
  slug: string;
  projectId: string;
  people: PersonOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  // Remounting the fields is how a controlled form gets cleared after success.
  const [generation, setGeneration] = useState(0);
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createMilestone(slug, projectId, prev, formData);
    if (result?.ok) setGeneration((g) => g + 1);
    return result;
  }, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      formRef.current?.reset();
    } else if (state && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      className="rounded-xl border border-border/80 bg-muted/40 p-3 shadow-xs"
    >
      <MilestoneFields
        key={generation}
        idPrefix="new-milestone"
        slug={slug}
        state={state}
        people={people}
      />
      <div className="mt-3">
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          <PlusIcon />
          {pending ? "Adding…" : "Add milestone"}
        </Button>
      </div>
    </form>
  );
}

function EditMilestoneDialog({
  slug,
  milestone,
  people,
}: {
  slug: string;
  milestone: MilestoneItem;
  people: PersonOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await updateMilestone(slug, milestone.id, prev, formData);
    if (result?.ok) {
      toast.success(result.message);
      setOpen(false);
    } else if (result && !result.fieldErrors) {
      toast.error(result.error);
    }
    return result;
  }, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Edit ${milestone.name}`} />}
      >
        <PencilIcon />
      </DialogTrigger>
      <DialogContent>
        <form action={action} noValidate>
          <DialogHeader>
            <DialogTitle>Edit milestone</DialogTitle>
            <DialogDescription>
              Changing the due date updates the project&apos;s next step.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <MilestoneFields
              idPrefix={`edit-${milestone.id}`}
              slug={slug}
              state={state}
              people={people}
              initial={milestone}
            />
          </div>
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

function DeleteMilestoneButton({ slug, milestone }: { slug: string; milestone: MilestoneItem }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${milestone.name}`}
            disabled={pending}
          />
        }
      >
        <Trash2Icon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {milestone.name}?</AlertDialogTitle>
          <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                const result = await deleteMilestone(slug, milestone.id);
                if (result?.ok) toast.success(result.message);
                else toast.error(result?.error ?? "Couldn't delete the milestone.");
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
