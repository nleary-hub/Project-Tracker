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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ActionState, fieldError } from "@/lib/action-result";
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/lib/milestones";
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

export interface MemberOption {
  value: string;
  label: string;
}

export function MilestonesPanel({
  slug,
  projectId,
  milestones,
  members,
  canEdit,
  today,
  timeZone,
}: {
  slug: string;
  projectId: string;
  /** Already sorted for display: open by due date, then completed. */
  milestones: MilestoneItem[];
  members: MemberOption[];
  canEdit: boolean;
  today: string;
  timeZone: string;
}) {
  const memberLabel = new Map(members.map((m) => [m.value, m.label]));
  const nextId = milestones.find((m) => m.completed_at === null)?.id ?? null;
  const open = milestones.filter((m) => m.completed_at === null).length;

  return (
    <section aria-labelledby="milestones-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="milestones-heading" className="text-base font-semibold text-ink">
          Milestones
        </h2>
        <span className="text-xs text-ink-muted">
          {open} open · {milestones.length - open} done
        </span>
      </div>

      {milestones.length === 0 ? (
        <p className="rounded-sm border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-ink-secondary">
          No milestones yet. The earliest open milestone becomes the project&apos;s &ldquo;next
          step&rdquo; in every report.
        </p>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-sm border border-border bg-surface">
          {milestones.map((m) => {
            const done = m.completed_at !== null;
            const overdue = isOverdue(m, today);
            return (
              <li
                key={m.id}
                className={cn("flex items-center gap-3 px-3 py-2", done && "text-ink-muted")}
              >
                <CompleteToggle slug={slug} milestone={m} disabled={!canEdit} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        done ? "line-through" : "text-ink",
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
                      <span className="text-ink-muted">No date</span>
                    )}
                    {m.owner_id && (
                      <span className="text-ink-muted">
                        {" "}
                        · {memberLabel.get(m.owner_id) ?? "Former member"}
                      </span>
                    )}
                    {done && m.completed_at && (
                      <span className="text-ink-muted">
                        {" "}
                        · Completed {formatDate(m.completed_at, timeZone)}
                      </span>
                    )}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <EditMilestoneDialog slug={slug} milestone={m} members={members} />
                    <DeleteMilestoneButton slug={slug} milestone={m} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {canEdit && <AddMilestoneForm slug={slug} projectId={projectId} members={members} />}
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
  state,
  members,
  initial,
}: {
  idPrefix: string;
  state: ActionState;
  members: MemberOption[];
  initial?: Pick<MilestoneItem, "name" | "due_date" | "owner_id">;
}) {
  // Controlled so a validation error doesn't wipe the typed values.
  const [name, setName] = useState(initial?.name ?? "");
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [ownerId, setOwnerId] = useState(initial?.owner_id ?? UNASSIGNED);
  const ownerItems = [{ value: UNASSIGNED, label: "Unassigned" }, ...members];
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
          <Select
            name="ownerId"
            items={ownerItems}
            value={ownerId}
            onValueChange={(v) => typeof v === "string" && setOwnerId(v)}
          >
            <SelectTrigger id={`${idPrefix}-owner`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ownerItems.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </FieldGroup>
  );
}

function AddMilestoneForm({
  slug,
  projectId,
  members,
}: {
  slug: string;
  projectId: string;
  members: MemberOption[];
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
      className="rounded-sm border border-border bg-surface-muted p-3"
    >
      <MilestoneFields key={generation} idPrefix="new-milestone" state={state} members={members} />
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
  members,
}: {
  slug: string;
  milestone: MilestoneItem;
  members: MemberOption[];
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
              state={state}
              members={members}
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
