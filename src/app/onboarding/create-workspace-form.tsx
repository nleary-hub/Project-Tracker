"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fieldError } from "@/lib/action-result";
import { slugify } from "@/lib/slug";

import { createWorkspace } from "./actions";

export function CreateWorkspaceForm({ origin }: { origin: string }) {
  const [state, action, pending] = useActionState(createWorkspace, null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const nameError = fieldError(state, "name");
  const slugError = fieldError(state, "slug");

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(nameError)}>
          <FieldLabel htmlFor="name">Workspace name</FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="organization"
            autoFocus
            required
            maxLength={80}
            value={name}
            aria-invalid={Boolean(nameError)}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="e.g. Northwind Portfolio"
          />
          <FieldDescription>Shown in the header and on every report.</FieldDescription>
          {nameError && <FieldError>{nameError}</FieldError>}
        </Field>

        <Field data-invalid={Boolean(slugError)}>
          <FieldLabel htmlFor="slug">URL name</FieldLabel>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap text-muted-foreground">{origin}/w/</span>
            <Input
              id="slug"
              name="slug"
              required
              maxLength={40}
              value={slug}
              aria-invalid={Boolean(slugError)}
              spellCheck={false}
              autoCapitalize="none"
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(
                  slugify(e.target.value.replace(/\s+/g, "-")) || e.target.value.toLowerCase(),
                );
              }}
              placeholder="northwind"
              className="font-mono"
            />
          </div>
          <FieldDescription>
            Lowercase letters, numbers and hyphens. You can&apos;t change it later.
          </FieldDescription>
          {slugError && <FieldError>{slugError}</FieldError>}
        </Field>

        {state && !state.ok && !state.fieldErrors && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Creating…" : "Create workspace"}
        </Button>
      </FieldGroup>
    </form>
  );
}
