"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { type ActionState, fail, succeed } from "@/lib/action-result";
import { NotAuthorizedError, requireWorkspace, requireWorkspaceAdmin } from "@/lib/auth/dal";
import { layoutPatchToRow, serializeFilterState } from "@/lib/data/table-layouts";
import { createClient } from "@/lib/supabase/server";
import type { FilterState } from "@/lib/table/filters";
import { type TableLayout, layoutTargets } from "@/lib/table/layout";
import type { Ranked } from "@/lib/table/reorder";

import type { GroupMove, RowMove } from "@/components/data-table/types";

/**
 * Layout, filter and ordering mutations for the projects table
 * (docs/PLAN.md §8). Which stored row a change goes to follows the
 * workspace's layout-sharing mode; RLS re-checks every write.
 */

const TABLE_KEY = "projects";
const NOT_ALLOWED = "You don't have permission to change the shared layout.";

const LayoutPatchSchema = z.object({
  columnOrder: z.array(z.string()).optional(),
  columnWidths: z.record(z.string(), z.number().min(24).max(2000)).optional(),
  hiddenColumns: z.array(z.string()).optional(),
  sort: z.array(z.object({ id: z.string(), desc: z.boolean() })).optional(),
  density: z.enum(["compact", "default", "comfortable"]).optional(),
  rowHeightPx: z.number().int().min(24).max(240).nullable().optional(),
});

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
  const parsed = LayoutPatchSchema.safeParse(patch);
  if (!parsed.success) return fail("That layout change isn't valid.");

  const ctx = await requireWorkspace(slug);
  const supabase = await createClient();
  const mode = await sharingMode(supabase, ctx.workspace.id);
  const target = layoutTargets(mode).columns;
  if (target === "shared" && !(ctx.isAdmin || mode === "shared")) return fail(NOT_ALLOWED);

  const userId = target === "shared" ? null : ctx.user.id;
  const row = layoutPatchToRow(parsed.data);

  // The shared/personal uniqueness lives in partial indexes, which PostgREST's
  // upsert can't target, so this is select-then-write. Two quick saves (e.g.
  // clicking a header three times) can both miss the select and race to
  // insert; the loser gets 23505 and simply retries as an update.
  const findExisting = async () => {
    let query = supabase
      .from("table_layouts")
      .select("id")
      .eq("workspace_id", ctx.workspace.id)
      .eq("table_key", TABLE_KEY);
    query = userId === null ? query.is("user_id", null) : query.eq("user_id", userId);
    return (await query.maybeSingle()).data;
  };
  const update = (id: string) =>
    supabase
      .from("table_layouts")
      .update({ ...row, updated_by: ctx.user.id })
      .eq("id", id);

  const existing = await findExisting();
  let { error } = existing
    ? await update(existing.id)
    : await supabase.from("table_layouts").insert({
        ...row,
        workspace_id: ctx.workspace.id,
        table_key: TABLE_KEY,
        user_id: userId,
        updated_by: ctx.user.id,
      });
  if (error?.code === "23505") {
    const raced = await findExisting();
    if (raced) ({ error } = await update(raced.id));
  }
  if (error) {
    console.error("table_layouts save failed", { code: error.code, message: error.message });
    return fail(error.code === "42501" ? NOT_ALLOWED : "Couldn't save the layout.");
  }

  revalidatePath(`/w/${slug}/projects`);
  return succeed();
}

export async function saveProjectsFilters(
  slug: string,
  filters: FilterState,
): Promise<ActionState> {
  const ctx = await requireWorkspace(slug);
  const supabase = await createClient();
  const { error } = await supabase.from("user_table_filters").upsert(
    {
      workspace_id: ctx.workspace.id,
      user_id: ctx.user.id,
      table_key: TABLE_KEY,
      filters: serializeFilterState(filters),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,user_id,table_key" },
  );
  if (error) return fail("Couldn't save your filters.");
  return succeed();
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
