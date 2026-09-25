"use server";

import { redirect } from "next/navigation";
import * as z from "zod";

import { type ActionState, fail } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/dal";
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the workspace a name.")
    .max(80, "Keep it under 80 characters."),
  slug: z
    .string()
    .trim()
    .min(1, "Choose a URL name.")
    .max(SLUG_MAX_LENGTH, `Keep it under ${SLUG_MAX_LENGTH} characters.`)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only."),
});

export async function createWorkspace(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const parsed = CreateWorkspaceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return fail("Check the highlighted fields.", z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workspace", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });

  if (error) {
    if (error.code === "23505") {
      return fail("That URL name is taken.", { slug: ["Already in use. Try another."] });
    }
    return fail("Couldn't create the workspace. Please try again.");
  }

  redirect(`/w/${data.slug}`);
}
