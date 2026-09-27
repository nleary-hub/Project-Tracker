"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { type ActionResult, type ActionState, fail, succeed } from "@/lib/action-result";
import { NotAuthorizedError, requireWorkspace, type WorkspaceContext } from "@/lib/auth/dal";
import { myPersonId } from "@/lib/data/people";
import { projectUpdateInputFromForm } from "@/lib/schemas/project-update";
import { createClient } from "@/lib/supabase/server";

/**
 * Manual project updates (docs/PLAN.md D7, §10): the project's owner or an
 * admin posts, edits and deletes them; every member reads them. RLS enforces
 * the same rules in the database.
 */

const NOT_ALLOWED = "Only the project's owner or an admin can post updates.";

function invalid(error: z.ZodError): ActionResult<never> {
  return fail("Check the highlighted fields.", z.flattenError(error).fieldErrors);
}

async function editorAction(
  slug: string,
  projectId: string,
  run: (
    ctx: WorkspaceContext,
    supabase: Awaited<ReturnType<typeof createClient>>,
  ) => Promise<ActionResult>,
): Promise<ActionState> {
  try {
    const ctx = await requireWorkspace(slug);
    const supabase = await createClient();
    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("workspace_id", ctx.workspace.id)
      .eq("id", projectId)
      .maybeSingle();
    if (!project) throw new NotAuthorizedError();
    if (!ctx.isAdmin) {
      const me = await myPersonId(supabase, ctx.workspace.id);
      if (!me || project.owner_id !== me) return fail(NOT_ALLOWED);
    }
    const result = await run(ctx, supabase);
    // The update shows on the project page, the projects list and the dashboard.
    if (result.ok) revalidatePath(`/w/${slug}`, "layout");
    return result;
  } catch (error) {
    if (error instanceof NotAuthorizedError) return fail(error.message);
    throw error;
  }
}

export async function createProjectUpdate(
  slug: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return editorAction(slug, projectId, async (ctx, supabase) => {
    const parsed = projectUpdateInputFromForm(formData);
    if (!parsed.success) return invalid(parsed.error);

    const { error } = await supabase.from("project_updates").insert({
      workspace_id: ctx.workspace.id,
      project_id: projectId,
      author_id: ctx.user.id,
      body: parsed.data.body,
      next_step: parsed.data.nextStep,
    });
    if (error) return fail(error.code === "42501" ? NOT_ALLOWED : "Couldn't post the update.");
    return succeed("Update posted.");
  });
}

export async function updateProjectUpdate(
  slug: string,
  projectId: string,
  updateId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return editorAction(slug, projectId, async (_ctx, supabase) => {
    const parsed = projectUpdateInputFromForm(formData);
    if (!parsed.success) return invalid(parsed.error);

    const { data, error } = await supabase
      .from("project_updates")
      .update({ body: parsed.data.body, next_step: parsed.data.nextStep })
      .eq("id", updateId)
      .eq("project_id", projectId)
      .select("id")
      .maybeSingle();
    if (error) return fail("Couldn't save the update. Please try again.");
    if (!data) return fail("That update no longer exists.");
    return succeed("Update saved.");
  });
}

export async function deleteProjectUpdate(
  slug: string,
  projectId: string,
  updateId: string,
): Promise<ActionState> {
  return editorAction(slug, projectId, async (_ctx, supabase) => {
    const { data, error } = await supabase
      .from("project_updates")
      .delete()
      .eq("id", updateId)
      .eq("project_id", projectId)
      .select("id")
      .maybeSingle();
    if (error) return fail("Couldn't delete the update. Please try again.");
    if (!data) return fail("That update no longer exists.");
    return succeed("Update deleted.");
  });
}
