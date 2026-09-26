"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createTask, updateTask } from "@/app/w/[slug]/task-actions";
import { PersonSelect } from "@/components/person-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { type ActionState, fieldError } from "@/lib/action-result";
import type { PersonOption } from "@/lib/people";
import { UNASSIGNED } from "@/lib/schemas/project";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";

export interface MilestoneOption {
  value: string;
  label: string;
}

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  milestoneId: string | null;
  dueDate: string | null;
}

const NO_MILESTONE = "none";
const STATUS_ITEMS = TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }));
const PRIORITY_ITEMS = TASK_PRIORITIES.map((p) => ({ value: p, label: TASK_PRIORITY_LABELS[p] }));

/** Controlled fields shared by the new-task and edit-task dialogs. */
function TaskFields({
  idPrefix,
  slug,
  state,
  people,
  milestones,
  initial,
}: {
  idPrefix: string;
  slug: string;
  state: ActionState;
  people: PersonOption[];
  milestones: MilestoneOption[];
  initial: TaskFormValues;
}) {
  const [v, setV] = useState({
    ...initial,
    assigneeId: initial.assigneeId ?? UNASSIGNED,
    milestoneId: initial.milestoneId ?? NO_MILESTONE,
    dueDate: initial.dueDate ?? "",
  });
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) =>
    setV((s) => ({ ...s, [key]: value }));
  const err = (f: string) => fieldError(state, f);
  const milestoneItems = [{ value: NO_MILESTONE, label: "No milestone" }, ...milestones];

  return (
    <FieldGroup className="gap-4">
      <Field data-invalid={Boolean(err("title"))}>
        <FieldLabel htmlFor={`${idPrefix}-title`}>Title</FieldLabel>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          value={v.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={200}
          required
          autoFocus
          placeholder="What needs doing?"
          aria-invalid={Boolean(err("title"))}
        />
        {err("title") && <FieldError>{err("title")}</FieldError>}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-status`}>Status</FieldLabel>
          <Select
            name="status"
            items={STATUS_ITEMS}
            value={v.status}
            onValueChange={(x) => typeof x === "string" && set("status", x as TaskStatus)}
          >
            <SelectTrigger id={`${idPrefix}-status`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ITEMS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-priority`}>Priority</FieldLabel>
          <Select
            name="priority"
            items={PRIORITY_ITEMS}
            value={v.priority}
            onValueChange={(x) => typeof x === "string" && set("priority", x as TaskPriority)}
          >
            <SelectTrigger id={`${idPrefix}-priority`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_ITEMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-assignee`}>Assignee</FieldLabel>
          <PersonSelect
            id={`${idPrefix}-assignee`}
            name="assigneeId"
            slug={slug}
            people={people}
            value={v.assigneeId}
            onChange={(x) => set("assigneeId", x)}
          />
        </Field>
        <Field data-invalid={Boolean(err("dueDate"))}>
          <FieldLabel htmlFor={`${idPrefix}-due`}>Due date</FieldLabel>
          <Input
            id={`${idPrefix}-due`}
            name="dueDate"
            type="date"
            value={v.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            aria-invalid={Boolean(err("dueDate"))}
          />
          {err("dueDate") && <FieldError>{err("dueDate")}</FieldError>}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-milestone`}>Milestone</FieldLabel>
        <Select
          name="milestoneId"
          items={milestoneItems}
          value={v.milestoneId}
          onValueChange={(x) => typeof x === "string" && set("milestoneId", x)}
        >
          <SelectTrigger id={`${idPrefix}-milestone`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {milestoneItems.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field data-invalid={Boolean(err("description"))}>
        <FieldLabel htmlFor={`${idPrefix}-description`}>Notes</FieldLabel>
        <Textarea
          id={`${idPrefix}-description`}
          name="description"
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Context, links, acceptance criteria…"
        />
        {err("description") && <FieldError>{err("description")}</FieldError>}
      </Field>
    </FieldGroup>
  );
}

const EMPTY: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assigneeId: null,
  milestoneId: null,
  dueDate: null,
};

export function NewTaskDialog({
  slug,
  projectId,
  people,
  milestones,
  open,
  onOpenChange,
  initial,
}: {
  slug: string;
  projectId: string;
  people: PersonOption[];
  milestones: MilestoneOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill, e.g. the milestone whose "Add task" was clicked. */
  initial?: Partial<TaskFormValues>;
}) {
  const [generation, setGeneration] = useState(0);
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createTask(slug, projectId, prev, formData);
    if (result?.ok) {
      toast.success(result.message);
      setGeneration((g) => g + 1);
      onOpenChange(false);
    } else if (result && !result.fieldErrors) {
      toast.error(result.error);
    }
    return result;
  }, null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={action} noValidate>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>Anyone in the workspace can add and edit tasks.</DialogDescription>
          </DialogHeader>
          <div className="my-5">
            <TaskFields
              key={generation}
              idPrefix="new-task"
              slug={slug}
              state={state}
              people={people}
              milestones={milestones}
              initial={{ ...EMPTY, ...initial }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditTaskDialog({
  slug,
  taskId,
  people,
  milestones,
  initial,
  open,
  onOpenChange,
}: {
  slug: string;
  taskId: string;
  people: PersonOption[];
  milestones: MilestoneOption[];
  initial: TaskFormValues;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await updateTask(slug, taskId, prev, formData);
    if (result?.ok) {
      toast.success(result.message);
      onOpenChange(false);
    } else if (result && !result.fieldErrors) {
      toast.error(result.error);
    }
    return result;
  }, null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={action} noValidate>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>
              Changes are logged in the project&apos;s activity.
            </DialogDescription>
          </DialogHeader>
          <div className="my-5">
            <TaskFields
              idPrefix={`edit-task-${taskId}`}
              slug={slug}
              state={state}
              people={people}
              milestones={milestones}
              initial={initial}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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

/** One-line "add a task" input: title only, Enter to add; details later. */
export function QuickAddTask({
  slug,
  projectId,
  onMore,
}: {
  slug: string;
  projectId: string;
  onMore: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createTask(slug, projectId, prev, formData);
    if (result?.ok) setTitle("");
    return result;
  }, null);

  useEffect(() => {
    if (state?.ok) toast.success(state.message);
    else if (state && !state.fieldErrors) toast.error(state.error);
  }, [state]);

  const error = fieldError(state, "title");
  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      className="flex items-center gap-2 border-t border-border/70 px-3 py-2"
    >
      <PlusIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task and press Enter…"
        aria-label="New task title"
        aria-invalid={Boolean(error)}
        maxLength={200}
        className="h-8 border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:bg-card"
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onMore}
        className="text-muted-foreground"
      >
        More options
      </Button>
      <Button type="submit" size="sm" variant="secondary" disabled={pending || !title.trim()}>
        {pending ? "Adding…" : "Add"}
      </Button>
    </form>
  );
}
