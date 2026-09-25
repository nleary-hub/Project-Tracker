import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { isAdminRole, type WorkspaceRole } from "./roles";

/**
 * Data access layer for identity and workspace membership. Every page and
 * Server Action goes through these so the authorization check can't be
 * forgotten; the database's RLS policies enforce the same rules underneath.
 */

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
}

export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return (
    data ?? {
      id: user.id,
      display_name: (user.user_metadata?.full_name as string | undefined) ?? "",
      email: user.email ?? "",
      avatar_url: null,
    }
  );
});

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  role: WorkspaceRole;
}

/** Workspaces the signed-in user belongs to, oldest membership first. */
export const getMyWorkspaces = cache(async (): Promise<WorkspaceSummary[]> => {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, created_at, workspace:workspaces(id, name, slug, timezone)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.flatMap((m) => (m.workspace ? [{ ...m.workspace, role: m.role }] : []));
});

export interface WorkspaceContext {
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>;
  workspace: { id: string; name: string; slug: string; timezone: string };
  role: WorkspaceRole;
  isAdmin: boolean;
}

export const getWorkspaceContext = cache(async (slug: string): Promise<WorkspaceContext | null> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug, timezone")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) return null;

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  return { user, workspace, role: membership.role, isAdmin: isAdminRole(membership.role) };
});

/** Non-members get a 404 so the workspace's existence isn't revealed. */
export async function requireWorkspace(slug: string): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext(slug);
  if (!ctx) notFound();
  return ctx;
}

export class NotAuthorizedError extends Error {
  constructor() {
    super("You don't have permission to do that.");
    this.name = "NotAuthorizedError";
  }
}

export async function requireWorkspaceAdmin(slug: string): Promise<WorkspaceContext> {
  const ctx = await requireWorkspace(slug);
  if (!ctx.isAdmin) throw new NotAuthorizedError();
  return ctx;
}
