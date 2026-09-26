import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActivityKind } from "@/lib/activity";
import type { Database, Json } from "@/lib/supabase/database.types";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  payload: Json;
  actorId: string | null;
  actorName: string;
  createdAt: string;
}

/** Latest events for a project, newest first, with the actor's display name. */
export async function listProjectActivity(
  supabase: SupabaseClient<Database>,
  projectId: string,
  limit = 40,
): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from("activity_events")
    .select("id, kind, payload, actor_id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const actorIds = [...new Set(data.map((e) => e.actor_id).filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", actorIds);
    for (const p of profiles ?? []) names.set(p.id, p.display_name || p.email);
  }

  return data.map((e) => ({
    id: e.id,
    kind: e.kind,
    payload: e.payload,
    actorId: e.actor_id,
    actorName: e.actor_id ? (names.get(e.actor_id) ?? "A former member") : "The system",
    createdAt: e.created_at,
  }));
}
