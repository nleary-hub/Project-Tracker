import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { WorkspaceRole } from "@/lib/auth/roles";
import type { Database } from "@/lib/supabase/database.types";

export interface WorkspaceMember {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
  joinedAt: string;
}

const ROLE_ORDER: Record<WorkspaceRole, number> = { owner: 0, admin: 1, member: 2 };

/** Members with their profiles, owner first then by name. */
export async function getWorkspaceMembers(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  if (memberships.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url")
    .in(
      "id",
      memberships.map((m) => m.user_id),
    );
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  return memberships
    .map((m) => {
      const p = byId.get(m.user_id);
      return {
        userId: m.user_id,
        displayName: p?.display_name ?? "",
        email: p?.email ?? "",
        avatarUrl: p?.avatar_url ?? null,
        role: m.role,
        joinedAt: m.created_at,
      };
    })
    .sort(
      (a, b) =>
        ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
        (a.displayName || a.email).localeCompare(b.displayName || b.email),
    );
}

export function memberLabel(member: Pick<WorkspaceMember, "displayName" | "email"> | undefined) {
  if (!member) return "Unassigned";
  return member.displayName || member.email;
}
