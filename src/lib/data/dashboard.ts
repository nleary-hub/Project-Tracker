import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActivityKind } from "@/lib/activity";
import { addDays } from "@/lib/projects";
import type { Database, Json } from "@/lib/supabase/database.types";

import { listOpenTasksForPerson, type MyTask } from "./tasks";

export interface UpcomingMilestone {
  id: string;
  name: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  ownerName: string | null;
  overdue: boolean;
}

export interface WorkspaceActivity {
  id: string;
  kind: ActivityKind;
  payload: Json;
  actorName: string;
  createdAt: string;
  projectId: string;
  projectName: string;
}

export interface DashboardData {
  counts: {
    activeProjects: number;
    overdueMilestones: number;
    dueThisWeek: number;
    myOpenTasks: number;
    myOverdueTasks: number;
  };
  myTasks: MyTask[];
  upcoming: UpcomingMilestone[];
  activity: WorkspaceActivity[];
}

/**
 * Everything the dashboard shows, in a handful of parallel queries. Health and
 * the charts join in M5–M6; this is the "work that needs you" half.
 */
export async function getDashboardData(
  supabase: SupabaseClient<Database>,
  args: { workspaceId: string; personId: string | null; today: string },
): Promise<DashboardData> {
  const { workspaceId, personId, today } = args;
  const weekOut = addDays(today, 7);
  const horizon = addDays(today, 14);

  const [projects, openMilestones, myTasks, events] = await Promise.all([
    supabase.from("projects").select("id, name, status").eq("workspace_id", workspaceId),
    supabase
      .from("milestones")
      .select("id, name, due_date, project_id, owner_id")
      .eq("workspace_id", workspaceId)
      .is("completed_at", null)
      .not("due_date", "is", null)
      .lte("due_date", horizon)
      .order("due_date"),
    personId ? listOpenTasksForPerson(supabase, workspaceId, personId) : Promise.resolve([]),
    supabase
      .from("activity_events")
      .select("id, kind, payload, actor_id, created_at, project_id")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const projectName = new Map((projects.data ?? []).map((p) => [p.id, p.name]));
  const activeProjects = (projects.data ?? []).filter((p) => p.status === "active").length;

  const milestones = openMilestones.data ?? [];
  const ownerIds = [
    ...new Set(milestones.map((m) => m.owner_id).filter((id): id is string => !!id)),
  ];
  const actorIds = [
    ...new Set((events.data ?? []).map((e) => e.actor_id).filter((id): id is string => !!id)),
  ];
  const [owners, actors] = await Promise.all([
    ownerIds.length
      ? supabase.from("people").select("id, name").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    actorIds.length
      ? supabase.from("profiles").select("id, display_name, email").in("id", actorIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string; email: string }[] }),
  ]);
  const ownerName = new Map((owners.data ?? []).map((p) => [p.id, p.name]));
  const actorName = new Map((actors.data ?? []).map((p) => [p.id, p.display_name || p.email]));

  const upcoming: UpcomingMilestone[] = milestones.map((m) => ({
    id: m.id,
    name: m.name,
    dueDate: m.due_date!,
    projectId: m.project_id,
    projectName: projectName.get(m.project_id) ?? "",
    ownerName: m.owner_id ? (ownerName.get(m.owner_id) ?? null) : null,
    overdue: m.due_date! < today,
  }));

  return {
    counts: {
      activeProjects,
      overdueMilestones: upcoming.filter((m) => m.overdue).length,
      dueThisWeek: upcoming.filter((m) => !m.overdue && m.dueDate <= weekOut).length,
      myOpenTasks: myTasks.length,
      myOverdueTasks: myTasks.filter((t) => t.due_date !== null && t.due_date < today).length,
    },
    myTasks,
    upcoming,
    activity: (events.data ?? []).map((e) => ({
      id: e.id,
      kind: e.kind,
      payload: e.payload,
      actorName: e.actor_id ? (actorName.get(e.actor_id) ?? "A former member") : "The system",
      createdAt: e.created_at,
      projectId: e.project_id,
      projectName: projectName.get(e.project_id) ?? "",
    })),
  };
}
