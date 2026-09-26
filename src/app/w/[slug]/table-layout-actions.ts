"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { type ActionState, fail, succeed } from "@/lib/action-result";
import { requireWorkspace } from "@/lib/auth/dal";
import { type TableKey, layoutPatchToRow, serializeFilterState } from "@/lib/data/table-layouts";
import { createClient } from "@/lib/supabase/server";
import type { FilterState } from "@/lib/table/filters";
import { type TableLayout, layoutTargets } from "@/lib/table/layout";

/**
 * Layout and filter persistence shared by every DataTable (docs/PLAN.md §8).
 * Which stored row a layout change goes to follows the workspace's
 * layout-sharing mode; filters are always the caller's own. RLS re-checks
 * every write.
 */

const NOT_ALLOWED = "You don't have permission to change the shared layout.";
const TABLE_KEYS = ["projects", "tasks", "milestones", "report"] as const;

const LayoutPatchSchema = z.object({
  columnOrder: z.array(z.string()).optional(),
  columnWidths: z.record(z.string(), z.number().min(24).max(2000)).optional(),
  hiddenColumns: z.array(z.string()).optional(),
  sort: z.array(z.object({ id: z.string(), desc: z.boolean() })).optional(),
  density: z.enum(["compact", "default", "comfortable"]).optional(),
  rowHeightPx: z.number().int().min(24).max(240).nullable().optional(),
});

function validKey(tableKey: string): tableKey is TableKey {
  return (TABLE_KEYS as readonly string[]).includes(tableKey);
}

export async function saveTableLayout(
  slug: string,
  tableKey: TableKey,
  patch: Partial<TableLayout>,
): Promise<ActionState> {
  if (!validKey(tableKey)) return fail("Unknown table.");
  const parsed = LayoutPatchSchema.safeParse(patch);
  if (!parsed.success) return fail("That layout change isn't valid.");

  const ctx = await requireWorkspace(slug);
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("workspace_settings")
    .select("layout_sharing")
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  const mode = settings?.layout_sharing ?? "shared";
  const target = layoutTargets(mode).columns;
  if (target === "shared" && !(ctx.isAdmin || mode === "shared")) return fail(NOT_ALLOWED);

  const userId = target === "shared" ? null : ctx.user.id;
  const row = layoutPatchToRow(parsed.data);

  // The shared/personal uniqueness lives in partial indexes, which PostgREST's
  // upsert can't target, so this is select-then-write. Two quick saves can
  // both miss the select and race to insert; the loser gets 23505 and retries
  // as an update.
  const findExisting = async () => {
    let query = supabase
      .from("table_layouts")
      .select("id")
      .eq("workspace_id", ctx.workspace.id)
      .eq("table_key", tableKey);
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
        table_key: tableKey,
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

  revalidatePath(`/w/${slug}`, "layout");
  return succeed();
}

export async function saveTableFilters(
  slug: string,
  tableKey: TableKey,
  filters: FilterState,
): Promise<ActionState> {
  if (!validKey(tableKey)) return fail("Unknown table.");
  const ctx = await requireWorkspace(slug);
  const supabase = await createClient();
  const { error } = await supabase.from("user_table_filters").upsert(
    {
      workspace_id: ctx.workspace.id,
      user_id: ctx.user.id,
      table_key: tableKey,
      filters: serializeFilterState(filters),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,user_id,table_key" },
  );
  if (error) return fail("Couldn't save your filters.");
  return succeed();
}
