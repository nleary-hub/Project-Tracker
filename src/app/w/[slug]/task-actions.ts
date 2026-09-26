"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { type ActionResult, type ActionState, fail, succeed } from "@/lib/action-result";
import { NotAuthorizedError, requireWorkspace, type WorkspaceContext } from "@/lib/auth/dal";
import { lastTaskRank } from "@/lib/data/tasks";
import { rankAfter } from "@/lib/rank";
import { taskInputFromForm } from "@/lib/schemas/task";
import { createClient } from "@/lib/supabase/server";
import {
  NO_MILESTONE_GROUP,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type TaskStatus,
} from "@/lib/tasks";

import type { RowMove } from "@/components/data-table/types";

/**
 * Task mutations (docs/PLAN.md §10): every member creates and edits tasks;
 * deleting takes the creator, the assignee or a project editor. RLS and the
 * task triggers enforce the same rules and write the activity log.
 */

function invalid(error: z.ZodError): ActionResult<never> {
  return fail("Check the highlighted fields.", z.flattenError(error).fieldErrors);
}

async function memberAction<T = undefined>(
  slug: string,
  run: (ctx: WorkspaceContext) => Promise<ActionResult<T>>,
): Promise<ActionState<T>> {
  try {
    const ctx = await requireWorkspace(slug);
    const result = await run(ctx);
    if (result.ok) revalidatePath(`/w/${slug}`, "layout");
    return result;
  } catch (error) {
    if (error instanceof NotAuthorizedError) return fail(error.message);
    throw error;
  }
}

async function projectInWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  projectId: string,
) {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", projectId)
    .maybeSingle();
  if (!data) throw new NotAuthorizedError();
}

export async function createTask(
  slug: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return memberAction(slug, async (ctx) => {
    const supabase = await createClient();
    await projectInWorkspace(supabase, ctx.workspace.id, projectId);
    const parsed = taskInputFromForm(formData);
    if (!parsed.success) return invalid(parsed.error);
    const t = parsed.data;

    const { error } = await supabase.from("tasks").insert({
      workspace_id: ctx.workspace.id,
      project_id: projectId,
      milestone_id: t.milestoneId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assignee_id: t.assigneeId,
      due_date: t.dueDate,
      rank: rankAfter(await lastTaskRank(supabase, projectId)),
      created_by: ctx.user.id,
    });
    if (error) return fail(taskError(error.code, "Couldn't add the task. Please try again."));
    return succeed(`Added ${t.title}.`);
  });
}

export async function updateTask(
  slug: string,
  taskId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return memberAction(slug, async (ctx) => {
    const supabase = await createClient();
    const parsed = taskInputFromForm(formData);
    if (!parsed.success) return invalid(parsed.error);
    const t = parsed.data;

    const { data, error } = await supabase
      .from("tasks")
      .update({
        milestone_id: t.milestoneId,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignee_id: t.assigneeId,
        due_date: t.dueDate,
      })
      .eq("id", taskId)
      .eq("workspace_id", ctx.workspace.id)
      .select("id")
      .maybeSingle();
    if (error) return fail(taskError(error.code, "Couldn't save the task. Please try again."));
    if (!data) return fail("That task no longer exists.");
    return succeed("Task saved.");
  });
}

const StatusSchema = z.enum(TASK_STATUSES);

export async function setTaskStatus(
  slug: string,
  taskId: string,
  status: TaskStatus,
): Promise<ActionState> {
  return memberAction(slug, async (ctx) => {
    const parsed = StatusSchema.safeParse(status);
    if (!parsed.success) return fail("That isn't a task status.");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .update({ status: parsed.data })
      .eq("id", taskId)
      .eq("workspace_id", ctx.workspace.id)
      .select("id")
      .maybeSingle();
    if (error) return fail("Couldn't update the task. Please try again.");
    if (!data) return fail("That task no longer exists.");
    return succeed(
      parsed.data === "done" ? "Task completed." : `Marked ${TASK_STATUS_LABELS[parsed.data]}.`,
    );
  });
}

export async function deleteTask(slug: string, taskId: string): Promise<ActionState> {
  return memberAction(slug, async (ctx) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("workspace_id", ctx.workspace.id)
      .select("id")
      .maybeSingle();
    if (error) return fail("Couldn't delete the task. Please try again.");
    // RLS silently filters rows the caller may not delete.
    if (!data)
      return fail("Only the task's creator, its assignee or a project editor can delete it.");
    return succeed("Task deleted.");
  });
}

// ---------------------------------------------------------------------------
// Drag and drop (tasks table on the project page). Groups are milestones; the
// "no milestone" group uses NO_MILESTONE_GROUP as its id.
// ---------------------------------------------------------------------------

const RowMoveSchema = z.object({
  rowId: z.uuid(),
  fromGroupId: z.string().min(1),
  toGroupId: z.string().min(1),
  rank: z.string().min(1).max(200),
});

export async function moveTaskRow(slug: string, move: RowMove): Promise<ActionState> {
  const parsed = RowMoveSchema.safeParse(move);
  if (!parsed.success) return fail("That move isn't valid.");
  const { rowId, fromGroupId, toGroupId, rank } = parsed.data;

  return memberAction(slug, async (ctx) => {
    const supabase = await createClient();
    const { data: settings } = await supabase
      .from("workspace_settings")
      .select("layout_sharing")
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle();
    const personalOrder = settings?.layout_sharing === "personal" && !ctx.isAdmin;
    const milestoneChanged = fromGroupId !== toGroupId;
    const milestoneId = toGroupId === NO_MILESTONE_GROUP ? null : toGroupId;

    if (milestoneChanged || !personalOrder) {
      const { error } = await supabase.rpc("move_task", {
        p_task: rowId,
        p_rank: personalOrder ? undefined : rank,
        p_milestone: milestoneChanged ? (milestoneId ?? undefined) : undefined,
        p_set_milestone: milestoneChanged,
      });
      if (error)
        return fail(
          error.code === "42501" ? "You can't move that task." : "Couldn't move the task.",
        );
    }
    if (personalOrder) {
      const { error } = await supabase.from("user_row_ranks").upsert(
        {
          workspace_id: ctx.workspace.id,
          user_id: ctx.user.id,
          table_key: "tasks",
          row_id: rowId,
          rank,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,user_id,table_key,row_id" },
      );
      if (error) return fail("Couldn't save your order.");
    }
    return succeed("Task moved.");
  });
}

export async function reorderTaskRows(
  slug: string,
  ranks: { id: string; rank: string }[],
): Promise<ActionState> {
  const parsed = z
    .array(z.object({ id: z.uuid(), rank: z.string().min(1).max(200) }))
    .max(500)
    .safeParse(ranks);
  if (!parsed.success) return fail("That order isn't valid.");

  return memberAction(slug, async (ctx) => {
    const supabase = await createClient();
    const { data: settings } = await supabase
      .from("workspace_settings")
      .select("layout_sharing")
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle();
    const personalOrder = settings?.layout_sharing === "personal" && !ctx.isAdmin;

    if (personalOrder) {
      const { error } = await supabase.from("user_row_ranks").upsert(
        parsed.data.map((r) => ({
          workspace_id: ctx.workspace.id,
          user_id: ctx.user.id,
          table_key: "tasks",
          row_id: r.id,
          rank: r.rank,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "workspace_id,user_id,table_key,row_id" },
      );
      if (error) return fail("Couldn't save your order.");
    } else {
      const { error } = await supabase.rpc("set_task_ranks", { p_ranks: parsed.data });
      if (error)
        return fail(
          error.code === "42501" ? "You can't reorder tasks here." : "Couldn't save the order.",
        );
    }
    return succeed("Order saved.");
  });
}

function taskError(code: string | undefined, fallback: string) {
  if (code === "23503") return "That milestone or assignee doesn't belong to this project.";
  if (code === "42501") return "You don't have permission to do that.";
  return fallback;
}
