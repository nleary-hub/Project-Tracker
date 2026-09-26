import fs from "node:fs";
import path from "node:path";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/supabase/database.types";
import { E2E, loadLocalEnv } from "./env";

export type Client = SupabaseClient<Database>;

export interface SignedIn {
  client: Client;
  cookies: [string, string][];
}

function env() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return { url, key };
}

/** Signs a user in with email/password and captures the cookies @supabase/ssr would set. */
export async function signIn(email: string, password: string): Promise<SignedIn> {
  const { url, key } = env();
  const jar = new Map<string, string>();
  const client = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return { client, cookies: [...jar.entries()] };
}

export function writeStorageState(file: string, cookies: [string, string][]) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify({
      cookies: cookies.map(([name, value]) => ({
        name,
        value,
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      })),
      origins: [],
    }),
  );
}

export const FIXTURE = {
  departments: ["Alpha", "Beta"],
  projects: [
    { name: "Alpha One", department: "Alpha" },
    { name: "Alpha Two", department: "Alpha" },
    { name: "Alpha Three", department: "Alpha" },
    { name: "Beta One", department: "Beta" },
    { name: "Beta Two", department: "Beta" },
  ],
};

/** Makes sure the fixture workspace exists with both users in it. Returns its id. */
export async function ensureWorkspace(owner: Client, member: Client): Promise<string> {
  const { data: ownerUser } = await owner.auth.getUser();
  const { data: memberUser } = await member.auth.getUser();
  if (!ownerUser.user || !memberUser.user) throw new Error("Could not resolve e2e users.");

  let { data: ws } = await owner
    .from("workspaces")
    .select("id")
    .eq("slug", E2E.workspaceSlug)
    .maybeSingle();
  if (!ws) {
    const { data, error } = await owner.rpc("create_workspace", {
      p_name: E2E.workspaceName,
      p_slug: E2E.workspaceSlug,
    });
    if (error) throw new Error(`create_workspace: ${error.message}`);
    ws = { id: data.id };
  }

  const { data: membership } = await member
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", ws.id)
    .eq("user_id", memberUser.user.id)
    .maybeSingle();
  if (!membership) {
    const { data: invite, error } = await owner
      .from("workspace_invites")
      .insert({ workspace_id: ws.id, role: "member", created_by: ownerUser.user.id })
      .select("token")
      .single();
    if (error) throw new Error(`invite: ${error.message}`);
    const accepted = await member.rpc("accept_invite", { p_token: invite.token });
    if (accepted.error) throw new Error(`accept_invite: ${accepted.error.message}`);
  }
  return ws.id;
}

/** Rebuilds rows, layouts, personal state and the sharing mode from scratch. */
export async function resetFixture(owner: Client, member: Client, workspaceId: string) {
  const { data: ownerUser } = await owner.auth.getUser();
  const ownerId = ownerUser.user!.id;
  // Owners are people (docs/PLAN.md D31); the member trigger created this row.
  const { data: ownerPerson } = await owner
    .from("people")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", ownerId)
    .single();
  if (!ownerPerson) throw new Error("owner has no person row");

  await owner.from("projects").delete().eq("workspace_id", workspaceId);
  await owner.from("departments").delete().eq("workspace_id", workspaceId);
  await owner.from("table_layouts").delete().eq("workspace_id", workspaceId).is("user_id", null);
  for (const client of [owner, member]) {
    const { data: me } = await client.auth.getUser();
    await client
      .from("table_layouts")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", me.user!.id);
    await client.from("user_row_ranks").delete().eq("workspace_id", workspaceId);
    await client.from("user_table_filters").delete().eq("workspace_id", workspaceId);
  }
  await owner
    .from("workspace_settings")
    .update({ layout_sharing: "shared" })
    .eq("workspace_id", workspaceId);

  const { data: departments, error: deptError } = await owner
    .from("departments")
    .insert(
      FIXTURE.departments.map((name, i) => ({ workspace_id: workspaceId, name, rank: `a${i}` })),
    )
    .select("id, name");
  if (deptError) throw new Error(`departments: ${deptError.message}`);
  const deptId = new Map(departments.map((d) => [d.name, d.id]));

  const { error: projectError } = await owner.from("projects").insert(
    FIXTURE.projects.map((p, i) => ({
      workspace_id: workspaceId,
      department_id: deptId.get(p.department)!,
      name: p.name,
      owner_id: ownerPerson.id,
      rank: `a${i}`,
      created_by: ownerId,
    })),
  );
  if (projectError) throw new Error(`projects: ${projectError.message}`);
}
