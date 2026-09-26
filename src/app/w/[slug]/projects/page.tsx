import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import type { DataTableGroup } from "@/components/data-table/types";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/lib/auth/dal";
import { getWorkspaceMembers, memberLabel } from "@/lib/data/members";
import { getPeople, myPersonId, personOptions } from "@/lib/data/people";
import { getDepartments, listProjects, type ProjectListItem } from "@/lib/data/projects";
import { getTableState, parseFilterState } from "@/lib/data/table-layouts";
import { addDays, todayInTimezone } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { dateContext, hasFilterParams, readFiltersFromParams } from "@/lib/table/filters";
import { decodeSort, layoutTargets, resolveLayout } from "@/lib/table/layout";
import { byRank } from "@/lib/rank";

import { PROJECT_COLUMNS, PROJECT_COLUMN_IDS } from "./projects-columns";
import { ProjectsTable } from "./projects-table";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  params,
  searchParams,
}: PageProps<"/w/[slug]/projects">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireWorkspace(slug);
  const { workspace } = ctx;
  const supabase = await createClient();

  const [departments, projects, members, people, me, state] = await Promise.all([
    getDepartments(supabase, workspace.id),
    listProjects(supabase, workspace.id),
    getWorkspaceMembers(supabase, workspace.id),
    getPeople(supabase, workspace.id),
    myPersonId(supabase, workspace.id),
    getTableState(supabase, {
      workspaceId: workspace.id,
      userId: ctx.user.id,
      tableKey: "projects",
    }),
  ]);

  const targets = layoutTargets(state.mode);
  const usePersonalOrder = targets.rowOrder === "personal";
  const rankOf = (p: ProjectListItem) =>
    usePersonalOrder ? (state.personalRanks.get(p.id) ?? p.rank) : p.rank;
  const ranked = projects.map((p) => ({ ...p, rank: rankOf(p) }));

  const groups: DataTableGroup<ProjectListItem>[] = departments
    .map((d) => ({
      id: d.id,
      label: d.name,
      rank: d.rank,
      note: d.archived ? "archived" : undefined,
      rows: ranked.filter((p) => p.department_id === d.id).sort(byRank),
    }))
    .filter((g) => !g.note || g.rows.length > 0);

  // Filters: the URL wins; otherwise the person's saved filters.
  const urlParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") urlParams.set(k, v);
    else if (Array.isArray(v) && v[0]) urlParams.set(k, v[0]);
  }
  const filters = hasFilterParams(urlParams)
    ? readFiltersFromParams(urlParams, PROJECT_COLUMNS)
    : parseFilterState(state.savedFilters, PROJECT_COLUMNS);

  const layout = resolveLayout(state.mode, state.shared, state.personal);
  const sort = urlParams.has("sort")
    ? decodeSort(urlParams.get("sort"), PROJECT_COLUMN_IDS)
    : layout.sort;

  const today = todayInTimezone(workspace.timezone);
  const dates = dateContext(today, addDays);
  const lastLayoutChange =
    state.mode === "shared" && state.sharedChangedBy
      ? {
          by:
            memberLabel(members.find((m) => m.userId === state.sharedChangedBy?.userId)) ||
            "a former member",
          at: state.sharedChangedBy.at,
        }
      : null;

  const activeDepartments = departments.filter((d) => !d.archived);
  const base = `/w/${slug}/projects`;

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
          <ProjectsTable
            slug={slug}
            groups={groups}
            people={personOptions(people)}
            layout={layout}
            sort={sort}
            filters={filters}
            dates={dates}
            timeZone={workspace.timezone}
            currentPersonId={me}
            isAdmin={ctx.isAdmin}
            mode={state.mode}
            lastLayoutChange={lastLayoutChange}
          />
        )}
      </PageBody>
    </>
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
