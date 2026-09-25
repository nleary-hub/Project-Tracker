"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fieldError } from "@/lib/action-result";

import { updateWorkspaceName } from "./actions";

export function WorkspaceNameForm({ slug, name }: { slug: string; name: string }) {
  const [state, action, pending] = useActionState(updateWorkspaceName.bind(null, slug), null);
  const error = fieldError(state, "name");

  useEffect(() => {
    if (state?.ok) toast.success(state.message);
    else if (state && !state.fieldErrors) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} noValidate className="flex max-w-md flex-col gap-3">
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor="workspace-name">Name</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="workspace-name"
            name="name"
            key={name}
            defaultValue={name}
            maxLength={80}
            required
            aria-invalid={Boolean(error)}
          />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
        {error && <FieldError>{error}</FieldError>}
      </Field>
    </form>
  );
}
