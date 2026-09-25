"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { type ActionResult, type ActionState, fail, succeed } from "@/lib/action-result";
import {
  NotAuthorizedError,
  requireWorkspace,
  requireWorkspaceAdmin,
  type WorkspaceContext,
} from "@/lib/auth/dal";
import { ASSIGNABLE_ROLES } from "@/lib/auth/roles";
import { rankAfter } from "@/lib/rank";
import { createClient } from "@/lib/supabase/server";

/**
 * Settings mutations. Every action re-checks membership and role on the server;
 * the database's RLS policies enforce the same rules a second time.
 */

const UNIQUE_VIOLATION = "23505";

async function adminAction<T = undefined>(
  slug: string,
  run: (ctx: WorkspaceContext) => Promise<ActionResult<T>>,
): Promise<ActionState<T>> {
  try {
    const ctx = await requireWorkspaceAdmin(slug);
    const result = await run(ctx);
    if (result.ok) revalidatePath(`/w/${slug}/settings`);
    return result;
  } catch (error) {
    if (error instanceof NotAuthorizedError) return fail(error.message);
    throw error;
  }
}

function invalid(error: z.ZodError): ActionResult {
  return fail("Check the highlighted fields.", z.flattenError(error).fieldErrors);
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

const WorkspaceNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the workspace a name.")
    .max(80, "Keep it under 80 characters."),
});

export async function updateWorkspaceName(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(slug, async (ctx) => {
    const parsed = WorkspaceNameSchema.safeParse({ name: formData.get("name") });
    if (!parsed.success) return invalid(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase
      .from("workspaces")
      .update({ name: parsed.data.name })
      .eq("id", ctx.workspace.id);
    if (error) return fail("Couldn't save the name. Please try again.");

    revalidatePath(`/w/${slug}`, "layout");
    return succeed("Workspace name saved.");
  });
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

const MemberRoleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(ASSIGNABLE_ROLES),
});

export async function updateMemberRole(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(slug, async (ctx) => {
    const parsed = MemberRoleSchema.safeParse({
      userId: formData.get("userId"),
      role: formData.get("role"),
    });
    if (!parsed.success) return fail("That change isn't valid.");
    if (parsed.data.userId === ctx.user.id) {
      return fail("You can't change your own role. Ask another admin.");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workspace_members")
      .update({ role: parsed.data.role })
      .eq("workspace_id", ctx.workspace.id)
      .eq("user_id", parsed.data.userId)
      .neq("role", "owner")
      .select("user_id");
    if (error) return fail("Couldn't update the role. Please try again.");
    if (!data.length) return fail("That member's role can't be changed.");
    return succeed("Role updated.");
  });
}

const MemberIdSchema = z.object({ userId: z.uuid() });

export async function removeMember(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(slug, async (ctx) => {
    const parsed = MemberIdSchema.safeParse({ userId: formData.get("userId") });
    if (!parsed.success) return fail("That change isn't valid.");
    if (parsed.data.userId === ctx.user.id) {
      return fail("Use “Leave workspace” to remove yourself.");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", ctx.workspace.id)
      .eq("user_id", parsed.data.userId)
      .neq("role", "owner")
      .select("user_id");
    if (error) return fail("Couldn't remove the member. Please try again.");
    if (!data.length) return fail("The workspace owner can't be removed.");
    return succeed("Member removed.");
  });
}

export async function leaveWorkspace(slug: string): Promise<ActionState> {
  const ctx = await requireWorkspace(slug);
  if (ctx.role === "owner") {
    return fail("The owner can't leave the workspace.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", ctx.workspace.id)
    .eq("user_id", ctx.user.id);
  if (error) return fail("Couldn't leave the workspace. Please try again.");

  redirect("/");
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

const CreateInviteSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES),
  label: z.string().trim().max(80, "Keep it under 80 characters.").optional(),
});

export async function createInvite(
  slug: string,
  _prev: ActionState<{ token: string }>,
  formData: FormData,
): Promise<ActionState<{ token: string }>> {
  return adminAction(slug, async (ctx) => {
    const parsed = CreateInviteSchema.safeParse({
      role: formData.get("role"),
      label: formData.get("label") || undefined,
    });
    if (!parsed.success) return invalid(parsed.error);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workspace_invites")
      .insert({
        workspace_id: ctx.workspace.id,
        role: parsed.data.role,
        label: parsed.data.label || null,
        created_by: ctx.user.id,
      })
      .select("token")
      .single();
    if (error) return fail("Couldn't create the invite link. Please try again.");
    return succeed("Invite link created.", { token: data.token });
  });
}

const InviteIdSchema = z.object({ inviteId: z.uuid() });

export async function revokeInvite(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(slug, async (ctx) => {
    const parsed = InviteIdSchema.safeParse({ inviteId: formData.get("inviteId") });
    if (!parsed.success) return fail("That change isn't valid.");

    const supabase = await createClient();
    const { error } = await supabase
      .from("workspace_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", parsed.data.inviteId)
      .eq("workspace_id", ctx.workspace.id)
      .is("accepted_at", null)
      .is("revoked_at", null);
    if (error) return fail("Couldn't revoke the link. Please try again.");
    return succeed("Invite link revoked.");
  });
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

const DepartmentNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the department a name.")
    .max(60, "Keep it under 60 characters."),
});

const DepartmentIdSchema = z.object({ departmentId: z.uuid() });

const DUPLICATE_DEPARTMENT = "A department with that name already exists.";

export async function createDepartment(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(slug, async (ctx) => {
    const parsed = DepartmentNameSchema.safeParse({ name: formData.get("name") });
    if (!parsed.success) return invalid(parsed.error);

    const supabase = await createClient();
    const { data: last } = await supabase
      .from("departments")
      .select("rank")
      .eq("workspace_id", ctx.workspace.id)
      .order("rank", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("departments").insert({
      workspace_id: ctx.workspace.id,
      name: parsed.data.name,
      rank: rankAfter(last?.rank),
    });
    if (error?.code === UNIQUE_VIOLATION)
      return fail(DUPLICATE_DEPARTMENT, { name: [DUPLICATE_DEPARTMENT] });
    if (error) return fail("Couldn't add the department. Please try again.");
    return succeed(`Added ${parsed.data.name}.`);
  });
}

export async function renameDepartment(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(slug, async (ctx) => {
    const parsed = DepartmentNameSchema.extend(DepartmentIdSchema.shape).safeParse({
      name: formData.get("name"),
      departmentId: formData.get("departmentId"),
    });
    if (!parsed.success) return invalid(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase
      .from("departments")
      .update({ name: parsed.data.name })
      .eq("id", parsed.data.departmentId)
      .eq("workspace_id", ctx.workspace.id);
    if (error?.code === UNIQUE_VIOLATION)
      return fail(DUPLICATE_DEPARTMENT, { name: [DUPLICATE_DEPARTMENT] });
    if (error) return fail("Couldn't rename the department. Please try again.");
    return succeed("Department renamed.");
  });
}

async function setDepartmentArchived(
  slug: string,
  formData: FormData,
  archived: boolean,
): Promise<ActionState> {
  return adminAction(slug, async (ctx) => {
    const parsed = DepartmentIdSchema.safeParse({ departmentId: formData.get("departmentId") });
    if (!parsed.success) return fail("That change isn't valid.");

    const supabase = await createClient();
    const { error } = await supabase
      .from("departments")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", parsed.data.departmentId)
      .eq("workspace_id", ctx.workspace.id);
    if (error?.code === UNIQUE_VIOLATION) {
      return fail("An active department already has that name. Rename it first.");
    }
    if (error) return fail("Couldn't update the department. Please try again.");
    return succeed(archived ? "Department archived." : "Department restored.");
  });
}

export async function archiveDepartment(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return setDepartmentArchived(slug, formData, true);
}

export async function restoreDepartment(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return setDepartmentArchived(slug, formData, false);
}

// ---------------------------------------------------------------------------
// Layout sharing (docs/PLAN.md D25)
// ---------------------------------------------------------------------------

const LayoutSharingSchema = z.object({ mode: z.enum(["shared", "split", "personal"]) });

export async function updateLayoutSharing(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(slug, async (ctx) => {
    const parsed = LayoutSharingSchema.safeParse({ mode: formData.get("mode") });
    if (!parsed.success) return fail("That change isn't valid.");

    const supabase = await createClient();
    const { error } = await supabase
      .from("workspace_settings")
      .update({ layout_sharing: parsed.data.mode, updated_by: ctx.user.id })
      .eq("workspace_id", ctx.workspace.id);
    if (error) return fail("Couldn't save the setting. Please try again.");
    return succeed("Layout sharing updated.");
  });
}
