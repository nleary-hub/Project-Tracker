import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/database.types";

export type ProjectUpdateRow = Pick<
  Tables<"project_updates">,
  "id" | "project_id" | "author_id" | "body" | "next_step" | "created_at" | "updated_at"
>;

const UPDATE_COLUMNS = "id, project_id, author_id, body, next_step, created_at, updated_at";

/** A project's updates, newest first. */
export async function listProjectUpdates(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<ProjectUpdateRow[]> {
  const { data, error } = await supabase
    .from("project_updates")
    .select(UPDATE_COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * The most recent update per project, for the projects list and (later) the
 * report. One query for the whole workspace, reduced here, the same way
 * listProjects() handles milestones.
 */
export async function latestUpdatesForWorkspace(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<Map<string, ProjectUpdateRow>> {
  const { data, error } = await supabase
    .from("project_updates")
    .select(UPDATE_COLUMNS)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const latest = new Map<string, ProjectUpdateRow>();
  for (const row of data) if (!latest.has(row.project_id)) latest.set(row.project_id, row);
  return latest;
}
