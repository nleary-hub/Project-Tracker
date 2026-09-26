"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { type ActionState, fail, succeed } from "@/lib/action-result";
import { NotAuthorizedError, requireWorkspace, requireWorkspaceAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { FilterState } from "@/lib/table/filters";
import { type TableLayout, layoutTargets } from "@/lib/table/layout";

import { saveTableFilters, saveTableLayout } from "../table-layout-actions";
import type { Ranked } from "@/lib/table/reorder";

import type { GroupMove, RowMove } from "@/components/data-table/types";

/**
 * Layout, filter and ordering mutations for the projects table
 * (docs/PLAN.md §8). Which stored row a change goes to follows the
 * workspace's layout-sharing mode; RLS re-checks every write.
 */

const TABLE_KEY = "projects";
const NOT_ALLOWED = "You don't have permission to change the shared layout.";

async function sharingMode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
) {
  const { data } = await supabase
    .from("workspace_settings")
    .select("layout_sharing")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data?.layout_sharing ?? "shared";
}

export async function saveProjectsLayout(
  slug: string,
  patch: Partial<TableLayout>,
): Promise<ActionState> {
  return saveTableLayout(slug, TABLE_KEY, patch);
}

export async function saveProjectsFilters(
  slug: string,
  filters: FilterState,
): Promise<ActionState> {
  return saveTableFilters(slug, TABLE_KEY, filters);
}

const RowMoveSchema = z.object({
  rowId: z.uuid(),
  fromGroupId: z.uuid(),
  toGroupId: z.uuid(),
  rank: z.string().min(1).max(200),
});

export async function moveProjectRow(slug: string, move: RowMove): Promise<ActionState> {
  const parsed = RowMoveSchema.safeParse(move);
  if (!parsed.success) return fail("That move isn't valid.");
  const { rowId, fromGroupId, toGroupId, rank } = parsed.data;

  const ctx = await requireWorkspace(slug);
  const supabase = await createClient();
  const mode = await sharingMode(supabase, ctx.workspace.id);
  const personalOrder = layoutTargets(mode).rowOrder === "personal" && !ctx.isAdmin;
  const departmentChanged = fromGroupId !== toGroupId;

  if (departmentChanged || !personalOrder) {
    const { error } = await supabase.rpc("move_project", {
      p_project: rowId,
      p_department: departmentChanged ? toGroupId : undefined,
      p_rank: personalOrder ? undefined : rank,
    });
    if (error) {
      console.error("move_project failed", {
        rowId,
        toGroupId,
        code: error.code,
        message: error.message,
      });
      if (error.code === "42501")
        return fail("Only the project owner or an admin can move it to another department.");
      if (error.code === "23503") return fail("That department no longer exists.");
      return fail("Couldn't move the project.");
    }
  }

  if (personalOrder) {
    const { error } = await supabase.from("user_row_ranks").upsert(
      {
        workspace_id: ctx.workspace.id,
        user_id: ctx.user.id,
        table_key: TABLE_KEY,
        row_id: rowId,
        rank,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,user_id,table_key,row_id" },
    );
    if (error) return fail("Couldn't save your order.");
  }

  revalidatePath(`/w/${slug}/projects`);
  return succeed();
}

const RanksSchema = z
  .array(z.object({ id: z.uuid(), rank: z.string().min(1).max(200) }))
  .min(1)
  .max(500);

export async function reorderProjectRows(slug: string, ranks: Ranked[]): Promise<ActionState> {
  const parsed = RanksSchema.safeParse(ranks);
  if (!parsed.success) return fail("That order isn't valid.");

  const ctx = await requireWorkspace(slug);
  const supabase = await createClient();
  const mode = await sharingMode(supabase, ctx.workspace.id);
  const personalOrder = layoutTargets(mode).rowOrder === "personal" && !ctx.isAdmin;

  if (personalOrder) {
    const now = new Date().toISOString();
    const { error } = await supabase.from("user_row_ranks").upsert(
      parsed.data.map((r) => ({
        workspace_id: ctx.workspace.id,
        user_id: ctx.user.id,
        table_key: TABLE_KEY,
        row_id: r.id,
        rank: r.rank,
        updated_at: now,
      })),
      { onConflict: "workspace_id,user_id,table_key,row_id" },
    );
    if (error) return fail("Couldn't save your order.");
  } else {
    const { error } = await supabase.rpc("set_project_ranks", { p_ranks: parsed.data });
    if (error) return fail(error.code === "42501" ? NOT_ALLOWED : "Couldn't save the order.");
  }

  revalidatePath(`/w/${slug}/projects`);
  return succeed();
}

const GroupMoveSchema = z.object({ groupId: z.uuid(), rank: z.string().min(1).max(200) });

export async function moveDepartmentGroup(slug: string, move: GroupMove): Promise<ActionState> {
  const parsed = GroupMoveSchema.safeParse(move);
  if (!parsed.success) return fail("That move isn't valid.");
  try {
    const ctx = await requireWorkspaceAdmin(slug);
    const supabase = await createClient();
    const { error } = await supabase
      .from("departments")
      .update({ rank: parsed.data.rank })
      .eq("id", parsed.data.groupId)
      .eq("workspace_id", ctx.workspace.id);
    if (error) return fail("Couldn't reorder the departments.");
    revalidatePath(`/w/${slug}`, "layout");
    return succeed();
  } catch (error) {
    if (error instanceof NotAuthorizedError) return fail("Only admins can reorder departments.");
    throw error;
  }
}
