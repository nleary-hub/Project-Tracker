"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/projects";
import { UNASSIGNED } from "@/lib/schemas/project";

export interface ProjectFormOption {
  value: string;
  label: string;
}

export interface ProjectFormValues {
  name: string;
  departmentId: string;
  ownerId: string | null;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  description: string;
}

const STATUS_ITEMS = PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }));

/**
 * Inputs are controlled so a server-side validation error doesn't wipe what
 * the user typed (React resets uncontrolled fields after a form action).
 */
export function ProjectForm({
  action,
  departments,
  members,
  initial,
  cancelHref,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  departments: ProjectFormOption[];
  members: ProjectFormOption[];
  initial: ProjectFormValues;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [values, setValues] = useState({
    ...initial,
    ownerId: initial.ownerId ?? UNASSIGNED,
    startDate: initial.startDate ?? "",
    dueDate: initial.dueDate ?? "",
  });
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const err = (field: string) => fieldError(state, field);
  const ownerItems = [{ value: UNASSIGNED, label: "Unassigned" }, ...members];

  return (
    <form action={formAction} noValidate className="max-w-2xl">
      <FieldGroup>
        <Field data-invalid={Boolean(err("name"))}>
          <FieldLabel htmlFor="project-name">Name</FieldLabel>
          <Input
            id="project-name"
            name="name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={120}
            required
            autoFocus={!initial.name}
            aria-invalid={Boolean(err("name"))}
          />
          {err("name") && <FieldError>{err("name")}</FieldError>}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(err("departmentId"))}>
            <FieldLabel htmlFor="project-department">Department</FieldLabel>
            <Select
              name="departmentId"
              items={departments}
              value={values.departmentId}
              onValueChange={(v) => typeof v === "string" && set("departmentId", v)}
            >
              <SelectTrigger
                id="project-department"
                className="w-full"
                aria-invalid={Boolean(err("departmentId"))}
              >
                <SelectValue placeholder="Choose a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {err("departmentId") && <FieldError>{err("departmentId")}</FieldError>}
          </Field>

          <Field data-invalid={Boolean(err("ownerId"))}>
            <FieldLabel htmlFor="project-owner">Owner</FieldLabel>
            <Select
              name="ownerId"
              items={ownerItems}
              value={values.ownerId}
              onValueChange={(v) => typeof v === "string" && set("ownerId", v)}
            >
              <SelectTrigger id="project-owner" className="w-full">
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
            <FieldDescription>
              Posts updates and answers for the project in reports.
            </FieldDescription>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="project-status">Status</FieldLabel>
            <Select
              name="status"
              items={STATUS_ITEMS}
              value={values.status}
              onValueChange={(v) => typeof v === "string" && set("status", v as ProjectStatus)}
            >
              <SelectTrigger id="project-status" className="w-full">
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
          <Field data-invalid={Boolean(err("startDate"))}>
            <FieldLabel htmlFor="project-start">Start date</FieldLabel>
            <Input
              id="project-start"
              name="startDate"
              type="date"
              value={values.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
            {err("startDate") && <FieldError>{err("startDate")}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(err("dueDate"))}>
            <FieldLabel htmlFor="project-due">Due date</FieldLabel>
            <Input
              id="project-due"
              name="dueDate"
              type="date"
              value={values.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              aria-invalid={Boolean(err("dueDate"))}
            />
            {err("dueDate") && <FieldError>{err("dueDate")}</FieldError>}
          </Field>
        </div>

        <Field data-invalid={Boolean(err("description"))}>
          <FieldLabel htmlFor="project-description">Description</FieldLabel>
          <Textarea
            id="project-description"
            name="description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={4000}
            rows={4}
            placeholder="What this project delivers and why it matters."
          />
          {err("description") && <FieldError>{err("description")}</FieldError>}
        </Field>

        {state && !state.ok && !state.fieldErrors && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
          <Button variant="ghost" render={<Link href={cancelHref} />} nativeButton={false}>
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
