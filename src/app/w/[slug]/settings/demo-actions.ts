"use server";

import { revalidatePath } from "next/cache";

import { type ActionState, fail, succeed } from "@/lib/action-result";
import { NotAuthorizedError, requireWorkspaceAdmin } from "@/lib/auth/dal";
import { getWorkspaceMembers } from "@/lib/data/members";
import { lastProjectRank } from "@/lib/data/projects";
import { DEMO_DEPARTMENTS, DEMO_PROJECTS, demoDate } from "@/lib/demo-data";
import { todayInTimezone } from "@/lib/projects";
import { rankAfter } from "@/lib/rank";
import { createClient } from "@/lib/supabase/server";

/**
 * Demo data (docs/PLAN.md D23). Loading is a few batched inserts from the app
 * (ranks are generated here); wiping is one atomic RPC that removes exactly
 * the rows flagged `is_demo`.
 */

export async function loadDemoData(slug: string): Promise<ActionState> {
  try {
    const ctx = await requireWorkspaceAdmin(slug);
    const supabase = await createClient();
    const workspaceId = ctx.workspace.id;

    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_demo", true);
    if (count && count > 0) return fail("Demo data is already loaded. Wipe it first to reload.");

    // Departments: reuse an active one with the same name, otherwise create it as demo.
    const { data: existing } = await supabase
      .from("departments")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null);
    const departmentIds = new Map((existing ?? []).map((d) => [d.name.toLowerCase(), d.id]));

    let rank = await lastProjectRank(supabase, workspaceId);
    let departmentRank =
      (
        await supabase
          .from("departments")
          .select("rank")
          .eq("workspace_id", workspaceId)
          .order("rank", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data?.rank ?? null;

    const missing = DEMO_DEPARTMENTS.filter((name) => !departmentIds.has(name.toLowerCase()));
    if (missing.length > 0) {
      const rows = missing.map((name) => {
        departmentRank = rankAfter(departmentRank);
        return { workspace_id: workspaceId, name, rank: departmentRank, is_demo: true };
      });
      const { data: created, error } = await supabase
        .from("departments")
        .insert(rows)
        .select("id, name");
      if (error) return fail("Couldn't create the demo departments.");
      for (const d of created) departmentIds.set(d.name.toLowerCase(), d.id);
    }

    const members = await getWorkspaceMembers(supabase, workspaceId);
    const today = todayInTimezone(ctx.workspace.timezone);

    const projectRows = DEMO_PROJECTS.map((p, i) => {
      rank = rankAfter(rank);
      return {
        workspace_id: workspaceId,
        department_id: departmentIds.get(p.department.toLowerCase())!,
        name: p.name,
        description: p.description,
        owner_id: members[i % members.length]?.userId ?? ctx.user.id,
        status: p.status,
        start_date: demoDate(today, p.startInDays),
        due_date: demoDate(today, p.dueInDays),
        rank,
        is_demo: true,
        created_by: ctx.user.id,
      };
    });
    const { data: projects, error: projectError } = await supabase
      .from("projects")
      .insert(projectRows)
      .select("id, name");
    if (projectError) return fail("Couldn't create the demo projects.");
    const projectIds = new Map(projects.map((p) => [p.name, p.id]));

    const milestoneRows = DEMO_PROJECTS.flatMap((p) => {
      let milestoneRank: string | null = null;
      return p.milestones.map((m) => {
        milestoneRank = rankAfter(milestoneRank);
        return {
          workspace_id: workspaceId,
          project_id: projectIds.get(p.name)!,
          name: m.name,
          due_date: demoDate(today, m.dueInDays),
          owner_id: projectRows.find((r) => r.name === p.name)?.owner_id ?? null,
          completed_at: m.completed ? new Date().toISOString() : null,
          rank: milestoneRank,
          is_demo: true,
        };
      });
    });
    const { error: milestoneError } = await supabase.from("milestones").insert(milestoneRows);
    if (milestoneError)
      return fail("Created the demo projects but not their milestones. Wipe and retry.");

    revalidatePath(`/w/${slug}`, "layout");
    return succeed(
      `Loaded ${projects.length} demo projects with ${milestoneRows.length} milestones.`,
    );
  } catch (error) {
    if (error instanceof NotAuthorizedError) return fail(error.message);
    throw error;
  }
}

export async function wipeDemoData(slug: string): Promise<ActionState> {
  try {
    const ctx = await requireWorkspaceAdmin(slug);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("wipe_demo_data", { ws: ctx.workspace.id });
    if (error) return fail("Couldn't remove the demo data. Please try again.");
    const removed = data[0];
    revalidatePath(`/w/${slug}`, "layout");
    return succeed(
      `Removed ${removed.projects_removed} demo ${removed.projects_removed === 1 ? "project" : "projects"} and ${removed.departments_removed} demo ${removed.departments_removed === 1 ? "department" : "departments"}.`,
    );
  } catch (error) {
    if (error instanceof NotAuthorizedError) return fail(error.message);
    throw error;
  }
}
