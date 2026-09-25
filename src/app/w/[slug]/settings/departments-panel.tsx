"use client";

import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, PlusIcon } from "lucide-react";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type ActionState, fieldError } from "@/lib/action-result";

import {
  archiveDepartment,
  createDepartment,
  renameDepartment,
  restoreDepartment,
} from "./actions";

export interface DepartmentRow {
  id: string;
  name: string;
  archived: boolean;
}

export function AddDepartmentForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(createDepartment.bind(null, slug), null);
  const formRef = useRef<HTMLFormElement>(null);
  const error = fieldError(state, "name");

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      formRef.current?.reset();
    } else if (state && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} noValidate className="max-w-md">
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor="new-department">Add a department</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="new-department"
            name="name"
            maxLength={60}
            required
            placeholder="e.g. Marketing"
            aria-invalid={Boolean(error)}
          />
          <Button type="submit" variant="outline" disabled={pending}>
            <PlusIcon />
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>
        {error && <FieldError>{error}</FieldError>}
      </Field>
    </form>
  );
}

export function DepartmentList({
  slug,
  departments,
  isAdmin,
}: {
  slug: string;
  departments: DepartmentRow[];
  isAdmin: boolean;
}) {
  const active = departments.filter((d) => !d.archived);
  const archived = departments.filter((d) => d.archived);
  const [showArchived, setShowArchived] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {active.length === 0 ? (
        <p className="rounded-sm border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-ink-secondary">
          No departments yet. Every project belongs to exactly one, so add the first before creating
          projects.
        </p>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-sm border border-border bg-surface">
          {active.map((d, i) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2">
              <span className="w-6 text-right text-xs text-ink-muted tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{d.name}</span>
              {isAdmin && (
                <div className="flex gap-1">
                  <RenameDepartmentDialog slug={slug} department={d} />
                  <ArchiveDepartmentButton slug={slug} department={d} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {archived.length > 0 && (
        <div>
          <button
            type="button"
            className="text-sm text-ink-secondary underline-offset-4 hover:underline"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
          >
            {showArchived ? "Hide" : "Show"} archived ({archived.length})
          </button>
          {showArchived && (
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-sm border border-border bg-surface">
              {archived.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-ink-muted">
                  <span className="min-w-0 flex-1 truncate text-sm">{d.name}</span>
                  {isAdmin && <RestoreDepartmentButton slug={slug} department={d} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RenameDepartmentDialog({ slug, department }: { slug: string; department: DepartmentRow }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await renameDepartment(slug, prev, formData);
    if (result?.ok) {
      toast.success(result.message);
      setOpen(false);
    } else if (result && !result.fieldErrors) {
      toast.error(result.error);
    }
    return result;
  }, null);
  const error = fieldError(state, "name");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Rename ${department.name}`} />}
      >
        <PencilIcon />
      </DialogTrigger>
      <DialogContent>
        <form action={action} noValidate>
          <DialogHeader>
            <DialogTitle>Rename department</DialogTitle>
            <DialogDescription>Projects and past reports keep their history.</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="departmentId" value={department.id} />
          <Field className="my-4" data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={`rename-${department.id}`}>Name</FieldLabel>
            <Input
              id={`rename-${department.id}`}
              name="name"
              defaultValue={department.name}
              maxLength={60}
              required
              autoFocus
              aria-invalid={Boolean(error)}
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
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

function ArchiveDepartmentButton({
  slug,
  department,
}: {
  slug: string;
  department: DepartmentRow;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Archive ${department.name}`}
            disabled={pending}
          />
        }
      >
        <ArchiveIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {department.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            It disappears from pickers and new reports. Existing projects keep it until they&apos;re
            moved. You can restore it any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const fd = new FormData();
                fd.set("departmentId", department.id);
                const result = await archiveDepartment(slug, null, fd);
                if (result?.ok) toast.success(result.message);
                else toast.error(result?.error ?? "Couldn't archive the department.");
              })
            }
          >
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RestoreDepartmentButton({
  slug,
  department,
}: {
  slug: string;
  department: DepartmentRow;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const fd = new FormData();
          fd.set("departmentId", department.id);
          const result = await restoreDepartment(slug, null, fd);
          if (result?.ok) toast.success(result.message);
          else toast.error(result?.error ?? "Couldn't restore the department.");
        })
      }
    >
      <ArchiveRestoreIcon />
      Restore
    </Button>
  );
}
