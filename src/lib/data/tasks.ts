import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/database.types";
import type { TaskPriority, TaskStatus } from "@/lib/tasks";

export type TaskRow = Pick<
  Tables<"tasks">,
  | "id"
  | "project_id"
  | "milestone_id"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "assignee_id"
  | "due_date"
  | "completed_at"
  | "rank"
  | "is_demo"
  | "created_by"
  | "created_at"
> & { status: TaskStatus; priority: TaskPriority };

const TASK_COLUMNS =
  "id, project_id, milestone_id, title, description, status, priority, assignee_id, due_date, completed_at, rank, is_demo, created_by, created_at";

export async function listProjectTasks(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("project_id", projectId)
    .order("rank");
  if (error) throw error;
  return data as TaskRow[];
}

export interface MyTask extends TaskRow {
  projectName: string;
}

/** Open tasks assigned to a person across the workspace, soonest due first. */
export async function listOpenTasksForPerson(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  personId: string,
): Promise<MyTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(`${TASK_COLUMNS}, project:projects!tasks_project_id_fkey(name)`)
    .eq("workspace_id", workspaceId)
    .eq("assignee_id", personId)
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("rank");
  if (error) throw error;
  return data.map(({ project, ...task }) => ({
    ...(task as TaskRow),
    projectName: project?.name ?? "",
  }));
}

/** Highest task rank in a project, for appending (null when there are none). */
export async function lastTaskRank(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("tasks")
    .select("rank")
    .eq("project_id", projectId)
    .order("rank", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.rank ?? null;
}
