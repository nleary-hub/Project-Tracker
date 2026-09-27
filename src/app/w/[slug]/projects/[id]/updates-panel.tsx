"use client";

import { ArrowRightIcon, MessageSquareTextIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyNote, Panel } from "@/components/panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type ActionState, fieldError } from "@/lib/action-result";
import { initialsOf } from "@/lib/initials";

import { createProjectUpdate, deleteProjectUpdate, updateProjectUpdate } from "./update-actions";

export interface UpdateItem {
  id: string;
  authorName: string;
  body: string;
  nextStep: string | null;
  /** Pre-formatted on the server so the client renders the same text. */
  when: string;
  whenExact: string;
  edited: boolean;
}

/**
 * Owner-written status updates (docs/PLAN.md D7): the newest one is what the
 * projects list and the biweekly report show as "Latest update". Separate
 * from the automatic activity log.
 */
export function UpdatesPanel({
  slug,
  projectId,
  updates,
  canEdit,
}: {
  slug: string;
  projectId: string;
  updates: UpdateItem[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<UpdateItem | null>(null);
  const [deleting, setDeleting] = useState<UpdateItem | null>(null);
  const reduce = useReducedMotion();

  return (
    <Panel
      id="updates"
      title="Updates"
      count={updates.length}
      description="Written by the project's owner. The latest one appears in the projects list and the report."
    >
      {canEdit && <ComposeUpdate slug={slug} projectId={projectId} />}

      {updates.length === 0 ? (
        <EmptyNote icon={MessageSquareTextIcon} title="No updates yet">
          {canEdit
            ? "Post the first update so the projects list and the next report have something to say."
            : "The project's owner hasn't posted an update yet."}
        </EmptyNote>
      ) : (
        <ol className="divide-y divide-border/70">
          <AnimatePresence initial={false}>
            {updates.map((u, i) => (
              <motion.li
                key={u.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                className="group/update flex gap-3 px-4 py-3.5 md:px-5"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand"
                >
                  {initialsOf(u.authorName, u.authorName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="text-[13px] font-medium text-foreground">{u.authorName}</span>
                    <time dateTime={u.whenExact} title={u.whenExact}>
                      {u.when}
                    </time>
                    {u.edited && <span>· edited</span>}
                    {i === 0 && <Badge variant="secondary">Latest</Badge>}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                    {u.body}
                  </p>
                  {u.nextStep && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[13px] text-foreground/90">
                      <ArrowRightIcon
                        className="mt-0.5 size-3.5 shrink-0 text-brand"
                        aria-hidden="true"
                      />
                      <span>
                        <span className="font-medium text-foreground">Next step:</span> {u.nextStep}
                      </span>
                    </p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within/update:opacity-100 group-hover/update:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Edit update"
                      onClick={() => setEditing(u)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete update"
                      onClick={() => setDeleting(u)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      {editing && (
        <EditUpdateDialog
          key={editing.id}
          slug={slug}
          projectId={projectId}
          update={editing}
          onClose={() => setEditing(null)}
        />
      )}
      <DeleteUpdateDialog
        slug={slug}
        projectId={projectId}
        update={deleting}
        onClose={() => setDeleting(null)}
      />
    </Panel>
  );
}

function UpdateFields({
  idPrefix,
  state,
  initial,
  autoFocus,
}: {
  idPrefix: string;
  state: ActionState;
  initial?: { body: string; nextStep: string | null };
  autoFocus?: boolean;
}) {
  // Controlled so a validation error doesn't wipe what was typed.
  const [body, setBody] = useState(initial?.body ?? "");
  const [nextStep, setNextStep] = useState(initial?.nextStep ?? "");
  const bodyError = fieldError(state, "body");
  const nextError = fieldError(state, "nextStep");
  return (
    <FieldGroup className="gap-3">
      <Field data-invalid={Boolean(bodyError)}>
        <FieldLabel htmlFor={`${idPrefix}-body`}>Update</FieldLabel>
        <Textarea
          id={`${idPrefix}-body`}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          required
          autoFocus={autoFocus}
          placeholder="What changed since the last update? Anything at risk?"
          aria-invalid={Boolean(bodyError)}
        />
        {bodyError && <FieldError>{bodyError}</FieldError>}
      </Field>
      <Field data-invalid={Boolean(nextError)}>
        <FieldLabel htmlFor={`${idPrefix}-next`}>Next step (optional)</FieldLabel>
        <Input
          id={`${idPrefix}-next`}
          name="nextStep"
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          maxLength={500}
          placeholder="e.g. Vendor contract signed by Friday"
          aria-invalid={Boolean(nextError)}
        />
        {nextError ? (
          <FieldError>{nextError}</FieldError>
        ) : (
          <FieldDescription>Shown beside the next milestone in reports.</FieldDescription>
        )}
      </Field>
    </FieldGroup>
  );
}

function ComposeUpdate({ slug, projectId }: { slug: string; projectId: string }) {
  // Remounting the fields is how a controlled form gets cleared after success.
  const [generation, setGeneration] = useState(0);
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createProjectUpdate(slug, projectId, prev, formData);
    if (result?.ok) setGeneration((g) => g + 1);
    return result;
  }, null);

  useEffect(() => {
    if (state?.ok) toast.success(state.message);
    else if (state && !state.fieldErrors) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={action}
      noValidate
      className="border-b border-border/70 bg-muted/30 px-4 py-4 md:px-5"
    >
      <UpdateFields key={generation} idPrefix="new-update" state={state} />
      <div className="mt-3 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Posting…" : "Post update"}
        </Button>
      </div>
    </form>
  );
}

function EditUpdateDialog({
  slug,
  projectId,
  update,
  onClose,
}: {
  slug: string;
  projectId: string;
  update: UpdateItem;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await updateProjectUpdate(slug, projectId, update.id, prev, formData);
    if (result?.ok) {
      toast.success(result.message);
      onClose();
    } else if (result && !result.fieldErrors) {
      toast.error(result.error);
    }
    return result;
  }, null);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form action={action} noValidate>
          <DialogHeader>
            <DialogTitle>Edit update</DialogTitle>
            <DialogDescription>
              Posted {update.when} by {update.authorName}.
            </DialogDescription>
          </DialogHeader>
          <div className="my-5">
            <UpdateFields
              idPrefix={`edit-update-${update.id}`}
              state={state}
              initial={update}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
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

function DeleteUpdateDialog({
  slug,
  projectId,
  update,
  onClose,
}: {
  slug: string;
  projectId: string;
  update: UpdateItem | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog open={update !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this update?</AlertDialogTitle>
          <AlertDialogDescription>
            It disappears from the project, the projects list and future reports. This can&apos;t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (!update) return;
                const result = await deleteProjectUpdate(slug, projectId, update.id);
                if (result?.ok) toast.success(result.message);
                else toast.error(result?.error ?? "Couldn't delete the update.");
                onClose();
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
