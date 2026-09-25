import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { type MilestoneLike, nextMilestone } from "@/lib/milestones";
import type { ProjectStatus } from "@/lib/projects";
import type { Database, Tables } from "@/lib/supabase/database.types";

export type ProjectRow = Pick<
  Tables<"projects">,
  | "id"
  | "department_id"
  | "name"
  | "description"
  | "owner_id"
  | "status"
  | "start_date"
  | "due_date"
  | "rank"
  | "is_demo"
  | "created_at"
>;

export type MilestoneRow = Pick<
  Tables<"milestones">,
  "id" | "project_id" | "name" | "due_date" | "owner_id" | "completed_at" | "rank" | "is_demo"
>;

export interface DepartmentRef {
  id: string;
  name: string;
  rank: string;
  archived: boolean;
}

export interface ProjectListItem extends ProjectRow {
  status: ProjectStatus;
  nextMilestone: MilestoneLike | null;
  openMilestones: number;
}

export async function getDepartments(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<DepartmentRef[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, rank, archived_at")
    .eq("workspace_id", workspaceId)
    .order("rank");
  if (error) throw error;
  return data.map((d) => ({
    id: d.id,
    name: d.name,
    rank: d.rank,
    archived: d.archived_at !== null,
  }));
}

/** All projects in a workspace with their next open milestone. */
export async function listProjects(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<ProjectListItem[]> {
  const [{ data: projects, error }, { data: milestones }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, department_id, name, description, owner_id, status, start_date, due_date, rank, is_demo, created_at",
      )
      .eq("workspace_id", workspaceId)
      .order("rank"),
    supabase
      .from("milestones")
      .select("id, project_id, name, due_date, completed_at, rank")
      .eq("workspace_id", workspaceId)
      .is("completed_at", null),
  ]);
  if (error) throw error;

  const byProject = new Map<string, MilestoneLike[]>();
  for (const m of milestones ?? []) {
    const list = byProject.get(m.project_id) ?? [];
    list.push(m);
    byProject.set(m.project_id, list);
  }

  return projects.map((p) => {
    const open = byProject.get(p.id) ?? [];
    return { ...p, nextMilestone: nextMilestone(open), openMilestones: open.length };
  });
}

export async function getProject(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  projectId: string,
): Promise<{ project: ProjectRow; milestones: MilestoneRow[] } | null> {
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, department_id, name, description, owner_id, status, start_date, due_date, rank, is_demo, created_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const { data: milestones, error } = await supabase
    .from("milestones")
    .select("id, project_id, name, due_date, owner_id, completed_at, rank, is_demo")
    .eq("project_id", projectId)
    .order("rank");
  if (error) throw error;

  return { project, milestones };
}

/** Highest project rank in a workspace, for appending (null when there are none). */
export async function lastProjectRank(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("projects")
    .select("rank")
    .eq("workspace_id", workspaceId)
    .order("rank", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.rank ?? null;
}

/** Highest milestone rank in a project, for appending (null when there are none). */
export async function lastMilestoneRank(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("milestones")
    .select("rank")
    .eq("project_id", projectId)
    .order("rank", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.rank ?? null;
}
