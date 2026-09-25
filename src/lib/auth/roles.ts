/** Workspace roles (docs/PLAN.md §10). Mirrors the `workspace_role` enum. */
export const WORKSPACE_ROLES = ["owner", "admin", "member"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** Roles an admin can hand out. Ownership is not transferable in v1. */
export const ASSIGNABLE_ROLES = ["admin", "member"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export const ROLE_DESCRIPTIONS: Record<AssignableRole, string> = {
  admin: "Manages members, departments, settings and reports",
  member: "Works on projects and tasks",
};

export function isAdminRole(role: WorkspaceRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function isAssignableRole(value: unknown): value is AssignableRole {
  return typeof value === "string" && (ASSIGNABLE_ROLES as readonly string[]).includes(value);
}
