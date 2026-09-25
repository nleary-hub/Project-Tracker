import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageBody, PageHeader } from "@/components/page-header";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireWorkspace } from "@/lib/auth/dal";
import { getWorkspaceMembers, memberLabel } from "@/lib/data/members";
import { getDepartments, listProjects, type ProjectListItem } from "@/lib/data/projects";
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/lib/milestones";
import { type ProjectStatus, PROJECT_STATUSES, todayInTimezone } from "@/lib/projects";
import { UNASSIGNED } from "@/lib/schemas/project";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { ProjectsFilters } from "./projects-filters";

export const metadata: Metadata = { title: "Projects" };

function param(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value ? value : null;
}

export default async function ProjectsPage({
  params,
  searchParams,
}: PageProps<"/w/[slug]/projects">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireWorkspace(slug);
  const { workspace } = ctx;
  const supabase = await createClient();

  const [departments, projects, members] = await Promise.all([
    getDepartments(supabase, workspace.id),
    listProjects(supabase, workspace.id),
    getWorkspaceMembers(supabase, workspace.id),
  ]);
  const memberById = new Map(members.map((m) => [m.userId, m]));
  const today = todayInTimezone(workspace.timezone);

  const departmentFilter = param(sp.department);
  const ownerFilter = param(sp.owner);
  const statusFilter = param(sp.status);
  const filtering = Boolean(departmentFilter || ownerFilter || statusFilter);

  const visible = projects.filter(
    (p) =>
      (!departmentFilter || p.department_id === departmentFilter) &&
      (!ownerFilter ||
        (ownerFilter === UNASSIGNED ? p.owner_id === null : p.owner_id === ownerFilter)) &&
      (!statusFilter ||
        !(PROJECT_STATUSES as readonly string[]).includes(statusFilter) ||
        p.status === statusFilter),
  );

  const groups = departments
    .map((d) => ({ department: d, projects: visible.filter((p) => p.department_id === d.id) }))
    .filter((g) => !g.department.archived || g.projects.length > 0);

  const base = `/w/${slug}/projects`;
  const activeDepartments = departments.filter((d) => !d.archived);

  return (
    <>
      <PageHeader
        title="Projects"
        description={`${projects.length} ${projects.length === 1 ? "project" : "projects"} across ${activeDepartments.length} ${activeDepartments.length === 1 ? "department" : "departments"}.`}
        actions={
          activeDepartments.length > 0 && (
            <Button render={<Link href={`${base}/new`} />} nativeButton={false}>
              <PlusIcon />
              New project
            </Button>
          )
        }
      />
      <PageBody>
        {activeDepartments.length === 0 ? (
          <EmptyState
            title="Add a department first"
            body="Every project belongs to exactly one department. Set up your departments in Settings, then come back to add projects."
            action={
              ctx.isAdmin ? (
                <Button
                  render={<Link href={`/w/${slug}/settings#departments`} />}
                  nativeButton={false}
                >
                  Open settings
                </Button>
              ) : (
                <p className="text-sm text-ink-muted">Ask an admin to add departments.</p>
              )
            }
          />
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            body="Add the first project, or load the demo portfolio to see how the tracker and the biweekly report work with realistic data."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button render={<Link href={`${base}/new`} />} nativeButton={false}>
                  <PlusIcon />
                  New project
                </Button>
                {ctx.isAdmin && (
                  <Button
                    variant="outline"
                    render={<Link href={`/w/${slug}/settings#demo`} />}
                    nativeButton={false}
                  >
                    Load demo data
                  </Button>
                )}
              </div>
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            <ProjectsFilters
              departments={departments
                .filter((d) => !d.archived)
                .map((d) => ({ value: d.id, label: d.name }))}
              members={members.map((m) => ({ value: m.userId, label: memberLabel(m) }))}
            />

            {visible.length === 0 && filtering && (
              <p className="rounded-sm border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-ink-secondary">
                No projects match these filters.
              </p>
            )}

            {groups.map(({ department, projects: rows }) => (
              <section key={department.id} aria-labelledby={`dept-${department.id}`}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h2 id={`dept-${department.id}`} className="text-sm font-semibold text-ink">
                    {department.name}
                  </h2>
                  {department.archived && (
                    <span className="text-xs text-ink-muted uppercase">archived</span>
                  )}
                  <span className="text-xs text-ink-muted">{rows.length}</span>
                </div>
                {rows.length === 0 ? (
                  <p className="rounded-sm border border-dashed border-border bg-surface px-3 py-3 text-sm text-ink-muted">
                    No projects{filtering ? " match" : ""} in {department.name}.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-sm border border-border bg-surface">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-surface-muted hover:bg-surface-muted">
                          <TableHead>Project</TableHead>
                          <TableHead className="w-44">Owner</TableHead>
                          <TableHead className="w-32">Status</TableHead>
                          <TableHead>Next milestone</TableHead>
                          <TableHead className="w-28">Due</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((p) => (
                          <ProjectTableRow
                            key={p.id}
                            project={p}
                            href={`${base}/${p.id}`}
                            owner={memberLabel(p.owner_id ? memberById.get(p.owner_id) : undefined)}
                            today={today}
                            timeZone={workspace.timezone}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}

function ProjectTableRow({
  project,
  href,
  owner,
  today,
  timeZone,
}: {
  project: ProjectListItem;
  href: string;
  owner: string;
  today: string;
  timeZone: string;
}) {
  const next = project.nextMilestone;
  const overdue = next ? isOverdue(next, today) : false;
  return (
    <TableRow>
      <TableCell>
        <Link href={href} className="font-medium text-ink hover:underline">
          {project.name}
        </Link>
        {project.is_demo && (
          <Badge variant="outline" className="ml-2 align-middle">
            Demo
          </Badge>
        )}
      </TableCell>
      <TableCell className={cn(!project.owner_id && "text-ink-muted")}>{owner}</TableCell>
      <TableCell>
        <ProjectStatusBadge status={project.status as ProjectStatus} />
      </TableCell>
      <TableCell className="max-w-64">
        {next ? (
          <span className="flex flex-col">
            <span className="truncate">{next.name}</span>
            {next.due_date && (
              <span
                className={cn(
                  "text-xs",
                  overdue ? "font-medium text-health-off-track" : "text-ink-muted",
                )}
              >
                {overdue ? "Overdue · " : ""}
                {formatDate(next.due_date, timeZone)}
              </span>
            )}
          </span>
        ) : (
          <span className="text-ink-muted">
            {project.status === "active" ? "No open milestones" : "—"}
          </span>
        )}
      </TableCell>
      <TableCell className="text-ink-secondary">
        {project.due_date ? formatDate(project.due_date, timeZone) : "—"}
      </TableCell>
    </TableRow>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-sm border border-dashed border-border bg-surface px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink-secondary">{body}</p>
      <div className="mt-6 flex justify-center">{action}</div>
    </div>
  );
}
