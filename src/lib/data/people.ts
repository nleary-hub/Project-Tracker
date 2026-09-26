import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PersonOption } from "@/lib/people";
import type { Database } from "@/lib/supabase/database.types";

export interface Person {
  id: string;
  name: string;
  email: string | null;
  userId: string | null;
  isDemo: boolean;
}

/** Everyone in the workspace directory, members first, then by name. */
export async function getPeople(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<Person[]> {
  const { data, error } = await supabase
    .from("people")
    .select("id, name, email, user_id, is_demo")
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw error;
  return data
    .map((p) => ({ id: p.id, name: p.name, email: p.email, userId: p.user_id, isDemo: p.is_demo }))
    .sort(
      (a, b) =>
        Number(b.userId !== null) - Number(a.userId !== null) || a.name.localeCompare(b.name),
    );
}

export function personOptions(people: readonly Person[]): PersonOption[] {
  return people.map((p) => ({ value: p.id, label: p.name, member: p.userId !== null }));
}

/** The signed-in user's person row in a workspace, or null. */
export async function myPersonId(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<string | null> {
  const { data } = await supabase.rpc("my_person_id", { ws: workspaceId });
  return data ?? null;
}

/** Whether the signed-in user is the person named as owner. */
export function isMyPerson(
  people: readonly Person[],
  personId: string | null | undefined,
  userId: string,
): boolean {
  if (!personId) return false;
  return people.some((p) => p.id === personId && p.userId === userId);
}
