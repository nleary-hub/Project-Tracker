"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { type ActionResult, type ActionState, fail, succeed } from "@/lib/action-result";
import { NotAuthorizedError, requireWorkspace, type WorkspaceContext } from "@/lib/auth/dal";
import { myPersonId } from "@/lib/data/people";
import { lastMilestoneRank, lastProjectRank } from "@/lib/data/projects";
import { rankAfter } from "@/lib/rank";
import { milestoneInputFromForm, projectInputFromForm } from "@/lib/schemas/project";
import { createClient } from "@/lib/supabase/server";

/**
 * Project and milestone mutations (docs/PLAN.md §10): any member creates
 * projects; the project owner or an admin edits them and manages milestones.
 * RLS enforces the same rules in the database.
 */

function invalid(error: z.ZodError): ActionResult<never> {
  return fail("Check the highlighted fields.", z.flattenError(error).fieldErrors);
}

// The owner is a person (docs/PLAN.md D31); "owner edits" means the signed-in
// user is the person named as owner.
async function requireProjectEditor(ctx: WorkspaceContext, projectId: string) {
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
    if (!me || project.owner_id !== me) throw new NotAuthorizedError();
  }
  return supabase;
}

async function memberAction<T = undefined>(
  slug: string,
  run: (ctx: WorkspaceContext) => Promise<ActionResult<T>>,
): Promise<ActionState<T>> {
  try {
    const ctx = await requireWorkspace(slug);
    const result = await run(ctx);
    if (result.ok) revalidatePath(`/w/${slug}/projects`, "layout");
    return result;
  } catch (error) {
    if (error instanceof NotAuthorizedError) return fail(error.message);
    throw error;
  }
}

async function activeDepartmentExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  departmentId: string,
) {
  const { data } = await supabase
    .from("departments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", departmentId)
    .is("archived_at", null)
    .maybeSingle();
  return Boolean(data);
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function createProject(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspace(slug);
  const parsed = projectInputFromForm(formData);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  if (!(await activeDepartmentExists(supabase, ctx.workspace.id, parsed.data.departmentId))) {
    return fail("Choose a department.", { departmentId: ["Choose an active department."] });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: ctx.workspace.id,
      department_id: parsed.data.departmentId,
      name: parsed.data.name,
      description: parsed.data.description,
      owner_id: parsed.data.ownerId,
      status: parsed.data.status,
      start_date: parsed.data.startDate,
      due_date: parsed.data.dueDate,
      rank: rankAfter(await lastProjectRank(supabase, ctx.workspace.id)),
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return fail("Couldn't create the project. Please try again.");

  revalidatePath(`/w/${slug}/projects`, "layout");
  redirect(`/w/${slug}/projects/${data.id}`);
}

export async function updateProject(
  slug: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await memberAction(slug, async (ctx) => {
    const supabase = await requireProjectEditor(ctx, projectId);
    const parsed = projectInputFromForm(formData);
    if (!parsed.success) return invalid(parsed.error);
    if (!(await activeDepartmentExists(supabase, ctx.workspace.id, parsed.data.departmentId))) {
      return fail("Choose a department.", { departmentId: ["Choose an active department."] });
    }

    const { error } = await supabase
      .from("projects")
      .update({
        department_id: parsed.data.departmentId,
        name: parsed.data.name,
        description: parsed.data.description,
        owner_id: parsed.data.ownerId,
        status: parsed.data.status,
        start_date: parsed.data.startDate,
        due_date: parsed.data.dueDate,
      })
      .eq("id", projectId)
      .eq("workspace_id", ctx.workspace.id);
    if (error) return fail("Couldn't save the project. Please try again.");
    return succeed("Project saved.");
  });

  if (result?.ok) redirect(`/w/${slug}/projects/${projectId}`);
  return result;
}

export async function deleteProject(slug: string, projectId: string): Promise<ActionState> {
  const result = await memberAction(slug, async (ctx) => {
    const supabase = await requireProjectEditor(ctx, projectId);
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("workspace_id", ctx.workspace.id);
    if (error) return fail("Couldn't delete the project. Please try again.");
    return succeed("Project deleted.");
  });

  if (result?.ok) redirect(`/w/${slug}/projects`);
  return result;
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function createMilestone(
  slug: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return memberAction(slug, async (ctx) => {
    const supabase = await requireProjectEditor(ctx, projectId);
    const parsed = milestoneInputFromForm(formData);
    if (!parsed.success) return invalid(parsed.error);

    const { error } = await supabase.from("milestones").insert({
      workspace_id: ctx.workspace.id,
      project_id: projectId,
      name: parsed.data.name,
      due_date: parsed.data.dueDate,
      owner_id: parsed.data.ownerId,
      rank: rankAfter(await lastMilestoneRank(supabase, projectId)),
    });
    if (error) return fail("Couldn't add the milestone. Please try again.");
    return succeed(`Added ${parsed.data.name}.`);
  });
}

async function milestoneProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  milestoneId: string,
) {
  const { data } = await supabase
    .from("milestones")
    .select("project_id")
    .eq("workspace_id", workspaceId)
    .eq("id", milestoneId)
    .maybeSingle();
  if (!data) throw new NotAuthorizedError();
  return data.project_id;
}

export async function updateMilestone(
  slug: string,
  milestoneId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return memberAction(slug, async (ctx) => {
    const supabase = await createClient();
    const projectId = await milestoneProject(supabase, ctx.workspace.id, milestoneId);
    await requireProjectEditor(ctx, projectId);
    const parsed = milestoneInputFromForm(formData);
    if (!parsed.success) return invalid(parsed.error);

    const { error } = await supabase
      .from("milestones")
      .update({
        name: parsed.data.name,
        due_date: parsed.data.dueDate,
        owner_id: parsed.data.ownerId,
      })
      .eq("id", milestoneId);
    if (error) return fail("Couldn't save the milestone. Please try again.");
    return succeed("Milestone saved.");
  });
}

export async function setMilestoneCompleted(
  slug: string,
  milestoneId: string,
  completed: boolean,
): Promise<ActionState> {
  return memberAction(slug, async (ctx) => {
    const supabase = await createClient();
    const projectId = await milestoneProject(supabase, ctx.workspace.id, milestoneId);
    await requireProjectEditor(ctx, projectId);

    const { error } = await supabase
      .from("milestones")
      .update({ completed_at: completed ? new Date().toISOString() : null })
      .eq("id", milestoneId);
    if (error) return fail("Couldn't update the milestone. Please try again.");
    return succeed(completed ? "Milestone completed." : "Milestone reopened.");
  });
}

export async function deleteMilestone(slug: string, milestoneId: string): Promise<ActionState> {
  return memberAction(slug, async (ctx) => {
    const supabase = await createClient();
    const projectId = await milestoneProject(supabase, ctx.workspace.id, milestoneId);
    await requireProjectEditor(ctx, projectId);

    const { error } = await supabase.from("milestones").delete().eq("id", milestoneId);
    if (error) return fail("Couldn't delete the milestone. Please try again.");
    return succeed("Milestone deleted.");
  });
}
