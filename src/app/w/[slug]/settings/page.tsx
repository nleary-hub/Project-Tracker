import type { Metadata } from "next";

import { ComingSoon, PageBody, PageHeader } from "@/components/page-header";
import { SettingsNote, SettingsSection } from "@/components/settings-section";
import { requireWorkspace } from "@/lib/auth/dal";
import { ROLE_LABELS, type WorkspaceRole } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";
import { inviteListStatus } from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

import { AddDepartmentForm, DepartmentList, type DepartmentRow } from "./departments-panel";
import { InvitesTable, NewInviteDialog, type InviteRow } from "./invites-panel";
import { LayoutSharingForm } from "./layout-sharing-form";
import { MembersTable, type MemberRow } from "./members-table";
import { WorkspaceNameForm } from "./workspace-name-form";

export const metadata: Metadata = { title: "Settings" };

const ROLE_ORDER: Record<WorkspaceRole, number> = { owner: 0, admin: 1, member: 2 };

type InviteRecord = Pick<
  Tables<"workspace_invites">,
  "id" | "token" | "role" | "label" | "created_by" | "expires_at" | "accepted_at" | "revoked_at"
>;

const SECTIONS = [
  { id: "workspace", label: "Workspace" },
  { id: "members", label: "Members" },
  { id: "invites", label: "Invite links", adminOnly: true },
  { id: "departments", label: "Departments" },
  { id: "layout", label: "Layout sharing" },
  { id: "reports", label: "Reports & branding" },
];

export default async function SettingsPage({ params }: PageProps<"/w/[slug]/settings">) {
  const { slug } = await params;
  const ctx = await requireWorkspace(slug);
  const { workspace, isAdmin } = ctx;
  const supabase = await createClient();

  const [membersRes, departmentsRes, settingsRes] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("user_id, role, created_at")
      .eq("workspace_id", workspace.id),
    supabase
      .from("departments")
      .select("id, name, rank, archived_at")
      .eq("workspace_id", workspace.id)
      .order("rank"),
    supabase
      .from("workspace_settings")
      .select("layout_sharing")
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
  ]);

  let invites: InviteRecord[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("workspace_invites")
      .select("id, token, role, label, created_by, expires_at, accepted_at, revoked_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });
    invites = data ?? [];
  }

  const memberships = membersRes.data ?? [];
  const profileIds = new Set<string>(memberships.map((m) => m.user_id));
  for (const invite of invites) if (invite.created_by) profileIds.add(invite.created_by);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url")
    .in("id", [...profileIds]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const members: MemberRow[] = memberships
    .map((m) => {
      const p = profileById.get(m.user_id);
      return {
        userId: m.user_id,
        displayName: p?.display_name ?? "",
        email: p?.email ?? "",
        avatarUrl: p?.avatar_url ?? null,
        role: m.role,
        joined: formatDate(m.created_at, workspace.timezone),
      };
    })
    .sort(
      (a, b) =>
        ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
        (a.displayName || a.email).localeCompare(b.displayName || b.email),
    );

  const inviteRows: InviteRow[] = invites.map((i) => ({
    id: i.id,
    token: i.token,
    role: i.role,
    label: i.label,
    status: inviteListStatus(i),
    expires: formatDate(i.expires_at, workspace.timezone),
    createdBy: i.created_by
      ? (profileById.get(i.created_by)?.display_name ?? "Former member")
      : "—",
  }));

  const departments: DepartmentRow[] = (departmentsRes.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    archived: d.archived_at !== null,
  }));

  const layoutMode = settingsRes.data?.layout_sharing ?? "shared";
  const sections = SECTIONS.filter((s) => !s.adminOnly || isAdmin);

  return (
    <>
      <PageHeader
        title="Settings"
        description={
          isAdmin
            ? `You're ${ctx.role === "owner" ? "the owner" : "an admin"} of ${workspace.name}.`
            : `You're a member of ${workspace.name}. Ask an admin to change these settings.`
        }
      />
      <PageBody>
        <div className="lg:grid lg:grid-cols-[168px_minmax(0,1fr)] lg:gap-12">
          <nav aria-label="Settings sections" className="hidden lg:block">
            <ul className="sticky top-6 flex flex-col gap-0.5 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block rounded-sm px-2 py-1 text-ink-secondary hover:bg-surface hover:text-ink"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <SettingsSection
              id="workspace"
              title="Workspace"
              description="The name appears in the header and on every report."
            >
              {isAdmin ? (
                <WorkspaceNameForm slug={workspace.slug} name={workspace.name} />
              ) : (
                <dl className="grid max-w-md grid-cols-[100px_1fr] gap-y-2 text-sm">
                  <dt className="text-ink-muted">Name</dt>
                  <dd className="font-medium text-ink">{workspace.name}</dd>
                </dl>
              )}
              <dl className="mt-4 grid max-w-md grid-cols-[100px_1fr] gap-y-2 text-sm">
                <dt className="text-ink-muted">Address</dt>
                <dd className="font-mono text-xs text-ink-secondary">/w/{workspace.slug}</dd>
                <dt className="text-ink-muted">Timezone</dt>
                <dd className="text-ink-secondary">{workspace.timezone}</dd>
              </dl>
            </SettingsSection>

            <SettingsSection
              id="members"
              title="Members"
              description={
                <>
                  {members.length} {members.length === 1 ? "person" : "people"}. {ROLE_LABELS.admin}
                  s manage members, departments, settings and reports.
                </>
              }
            >
              <MembersTable
                slug={workspace.slug}
                members={members}
                currentUserId={ctx.user.id}
                isAdmin={isAdmin}
              />
            </SettingsSection>

            {isAdmin && (
              <SettingsSection
                id="invites"
                title="Invite links"
                description="Create a link, copy it and send it yourself. Each link admits one person and expires after 7 days."
                actions={<NewInviteDialog slug={workspace.slug} />}
              >
                <InvitesTable slug={workspace.slug} invites={inviteRows} />
              </SettingsSection>
            )}

            <SettingsSection
              id="departments"
              title="Departments"
              description="Every project belongs to exactly one department. Their order here sets the order of report sections; drag-to-reorder arrives with the interactive tables."
            >
              <div className="flex flex-col gap-5">
                {isAdmin && <AddDepartmentForm slug={workspace.slug} />}
                <DepartmentList slug={workspace.slug} departments={departments} isAdmin={isAdmin} />
              </div>
            </SettingsSection>

            <SettingsSection
              id="layout"
              title="Layout sharing"
              description="Whether table layouts — row order, columns, widths, sort — are shared by the team or kept per person. Filters are always personal."
            >
              <div className="flex flex-col gap-3">
                {!isAdmin && <SettingsNote>Set by admins. Showing the current mode.</SettingsNote>}
                <LayoutSharingForm slug={workspace.slug} mode={layoutMode} isAdmin={isAdmin} />
              </div>
            </SettingsSection>

            <SettingsSection
              id="reports"
              title="Reports & branding"
              description="Report schedule, recipients, thresholds, charts, logo and accent color."
            >
              <ComingSoon milestone="M6–M8">
                Report schedule and approval mode, distribution list, at-risk window, chart toggles,
                branding, and demo data.
              </ComingSoon>
            </SettingsSection>
          </div>
        </div>
      </PageBody>
    </>
  );
}
