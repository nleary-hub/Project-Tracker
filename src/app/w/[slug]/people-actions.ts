"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { type ActionResult, type ActionState, fail, succeed } from "@/lib/action-result";
import { NotAuthorizedError, requireWorkspace, requireWorkspaceAdmin } from "@/lib/auth/dal";
import { personInputFromForm } from "@/lib/schemas/person";
import { createClient } from "@/lib/supabase/server";

/**
 * People directory (docs/PLAN.md D31). Any member can add someone so they can
 * be named as an owner or assignee; admins edit and remove people who aren't
 * linked to a signed-in user (linked rows follow the member's profile).
 */

export interface CreatedPerson {
  id: string;
  name: string;
}

function invalid(error: z.ZodError): ActionResult<never> {
  return fail("Check the highlighted fields.", z.flattenError(error).fieldErrors);
}

export async function createPerson(
  slug: string,
  _prev: ActionState<CreatedPerson>,
  formData: FormData,
): Promise<ActionState<CreatedPerson>> {
  try {
    const ctx = await requireWorkspace(slug);
    const parsed = personInputFromForm(formData);
    if (!parsed.success) return invalid(parsed.error);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("people")
      .insert({ workspace_id: ctx.workspace.id, name: parsed.data.name, email: parsed.data.email })
      .select("id, name")
      .single();
    if (error) return fail("Couldn't add that person. Please try again.");

    revalidatePath(`/w/${slug}`, "layout");
    return succeed(`Added ${data.name}.`, data);
  } catch (error) {
    if (error instanceof NotAuthorizedError) return fail(error.message);
    throw error;
  }
}

export async function updatePerson(
  slug: string,
  personId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const ctx = await requireWorkspaceAdmin(slug);
    const parsed = personInputFromForm(formData);
    if (!parsed.success) return invalid(parsed.error);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("people")
      .update({ name: parsed.data.name, email: parsed.data.email })
      .eq("id", personId)
      .eq("workspace_id", ctx.workspace.id)
      .is("user_id", null)
      .select("id")
      .maybeSingle();
    if (error) return fail("Couldn't save. Please try again.");
    if (!data) return fail("Members are edited from their own profile, not here.");

    revalidatePath(`/w/${slug}`, "layout");
    return succeed("Saved.");
  } catch (error) {
    if (error instanceof NotAuthorizedError) return fail(error.message);
    throw error;
  }
}

export async function deletePerson(slug: string, personId: string): Promise<ActionState> {
  try {
    const ctx = await requireWorkspaceAdmin(slug);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("people")
      .delete()
      .eq("id", personId)
      .eq("workspace_id", ctx.workspace.id)
      .is("user_id", null)
      .select("id")
      .maybeSingle();
    if (error) return fail("Couldn't remove that person. Please try again.");
    if (!data) return fail("Members can't be removed from here.");

    revalidatePath(`/w/${slug}`, "layout");
    return succeed("Removed. Anything they owned is now unassigned.");
  } catch (error) {
    if (error instanceof NotAuthorizedError) return fail(error.message);
    throw error;
  }
}
