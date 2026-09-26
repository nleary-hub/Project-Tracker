import { ChevronRightIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityFeed } from "@/components/activity-feed";
import { PageBody, PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableGroup } from "@/components/data-table/types";
import { requireWorkspace } from "@/lib/auth/dal";
import { listProjectActivity } from "@/lib/data/activity";
import { getPeople, isMyPerson, personOptions } from "@/lib/data/people";
import { getDepartments, getProject } from "@/lib/data/projects";
import { getTableState, parseFilterState } from "@/lib/data/table-layouts";
import { listProjectTasks, type TaskRow } from "@/lib/data/tasks";
import { getWorkspaceMembers, memberLabel } from "@/lib/data/members";
import { formatDate, formatDateTime, timeAgo } from "@/lib/format";
import { sortForDisplay } from "@/lib/milestones";
import { personLabel } from "@/lib/people";
import { type ProjectStatus, addDays, todayInTimezone } from "@/lib/projects";
import { byRank } from "@/lib/rank";
import { createClient } from "@/lib/supabase/server";
import { dateContext, hasFilterParams, readFiltersFromParams } from "@/lib/table/filters";
import { decodeSort, layoutTargets, resolveLayout } from "@/lib/table/layout";
import { NO_MILESTONE_GROUP } from "@/lib/tasks";

import { MilestonesPanel } from "./milestones-panel";
import { ProjectMenu } from "./project-menu";
import { TASK_COLUMNS, TASK_COLUMN_IDS } from "./tasks-columns";
import { NewTaskButton, TasksTable } from "./tasks-table";

export async function generateMetadata({
  params,
}: PageProps<"/w/[slug]/projects/[id]">): Promise<Metadata> {
  const { slug, id } = await params;
  const ctx = await requireWorkspace(slug);
  const supabase = await createClient();
  const result = await getProject(supabase, ctx.workspace.id, id);
  return { title: result?.project.name ?? "Project" };
}

export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/w/[slug]/projects/[id]">) {
  const [{ slug, id }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireWorkspace(slug);
  const { workspace } = ctx;
  const supabase = await createClient();

  const result = await getProject(supabase, workspace.id, id);
  if (!result) notFound();
  const { project, milestones } = result;

  const [departments, people, members, tasks, activity, tableState] = await Promise.all([
    getDepartments(supabase, workspace.id),
    getPeople(supabase, workspace.id),
    getWorkspaceMembers(supabase, workspace.id),
    listProjectTasks(supabase, id),
    listProjectActivity(supabase, id),
    getTableState(supabase, { workspaceId: workspace.id, userId: ctx.user.id, tableKey: "tasks" }),
  ]);
  const department = departments.find((d) => d.id === project.department_id);
  const owner = people.find((p) => p.id === project.owner_id);
  const canEdit = ctx.isAdmin || isMyPerson(people, project.owner_id, ctx.user.id);
  const now = new Date();
  const today = todayInTimezone(workspace.timezone, now);
  const peopleOptions = personOptions(people);
  const sortedMilestones = sortForDisplay(milestones);
  const base = `/w/${slug}/projects`;
  const fmt = (d: string) => formatDate(d, workspace.timezone);

  // Tasks grouped by milestone (open milestones in due order, then completed, then none).
  const usePersonalOrder = layoutTargets(tableState.mode).rowOrder === "personal";
  const ranked: TaskRow[] = tasks.map((t) => ({
    ...t,
    rank: usePersonalOrder ? (tableState.personalRanks.get(t.id) ?? t.rank) : t.rank,
  }));
  const allGroups: DataTableGroup<TaskRow>[] = [
    ...sortedMilestones.map((m, i) => ({
      id: m.id,
      label: m.name,
      rank: String(i).padStart(4, "0"),
      note: m.completed_at ? "done" : undefined,
      rows: ranked.filter((t) => t.milestone_id === m.id).sort(byRank),
    })),
    {
      id: NO_MILESTONE_GROUP,
      label: "No milestone",
      rank: "9999",
      note: undefined,
      rows: ranked.filter((t) => t.milestone_id === null).sort(byRank),
    },
  ];
  // Completed milestones only show when they still have tasks under them.
  const groups = allGroups.filter((g) => g.rows.length > 0 || !g.note);

  const urlParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") urlParams.set(k, v);
    else if (Array.isArray(v) && v[0]) urlParams.set(k, v[0]);
  }
  const filters = hasFilterParams(urlParams)
    ? readFiltersFromParams(urlParams, TASK_COLUMNS)
    : parseFilterState(tableState.savedFilters, TASK_COLUMNS);
  const layout = resolveLayout(tableState.mode, tableState.shared, tableState.personal);
  const sort = urlParams.has("sort")
    ? decodeSort(urlParams.get("sort"), TASK_COLUMN_IDS)
    : layout.sort;
  const lastLayoutChange =
    tableState.mode === "shared" && tableState.sharedChangedBy
      ? {
          by:
            memberLabel(members.find((m) => m.userId === tableState.sharedChangedBy?.userId)) ||
            "a former member",
          at: tableState.sharedChangedBy.at,
        }
      : null;
  const milestoneOptions = sortedMilestones.map((m) => ({ value: m.id, label: m.name }));
  const openTasks = tasks.filter((t) => t.status !== "done").length;

  return (
    <>
      <PageHeader
        eyebrow={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1">
            <Link href={base} className="hover:text-foreground">
              Projects
            </Link>
            <ChevronRightIcon className="size-3" aria-hidden="true" />
            <Link
              href={`${base}?f.department=${project.department_id}`}
              className="hover:text-foreground"
            >
              {department?.name ?? "No department"}
            </Link>
          </nav>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {project.name}
            <ProjectStatusBadge status={project.status as ProjectStatus} />
            {project.is_demo && <Badge variant="outline">Demo</Badge>}
          </span>
        }
        description={
          <>
            Owned by{" "}
            <span className="font-medium text-foreground">{personLabel(owner, "nobody yet")}</span>
            {project.due_date && <> · due {fmt(project.due_date)}</>}
          </>
        }
        actions={
          canEdit && (
            <>
              <Button
                variant="outline"
                render={<Link href={`${base}/${id}/edit`} />}
                nativeButton={false}
              >
                <PencilIcon />
                Edit
              </Button>
              <ProjectMenu slug={slug} projectId={id} projectName={project.name} />
            </>
          )
        }
      />
      <PageBody>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-6">
            {project.description ? (
              <p className="max-w-3xl text-sm leading-relaxed whitespace-pre-line text-foreground/85">
                {project.description}
              </p>
            ) : (
              canEdit && (
                <p className="text-sm text-muted-foreground">
                  No description yet.{" "}
                  <Link href={`${base}/${id}/edit`} className="underline underline-offset-4">
                    Add one
                  </Link>
                  .
                </p>
              )
            )}

            <section aria-labelledby="tasks-heading" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2
                  id="tasks-heading"
                  className="flex items-center gap-2 text-[15px] font-semibold text-foreground"
                >
                  Tasks
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {openTasks} open
                  </span>
                </h2>
                <NewTaskButton
                  slug={slug}
                  projectId={id}
                  people={peopleOptions}
                  milestones={milestoneOptions}
                />
              </div>
              <TasksTable
                slug={slug}
                projectId={id}
                groups={groups}
                milestones={milestoneOptions}
                people={peopleOptions}
                layout={layout}
                sort={sort}
                filters={filters}
                dates={dateContext(today, addDays)}
                timeZone={workspace.timezone}
                lastLayoutChange={lastLayoutChange}
              />
            </section>

            <MilestonesPanel
              slug={slug}
              projectId={id}
              milestones={sortedMilestones}
              people={peopleOptions}
              canEdit={canEdit}
              today={today}
              timeZone={workspace.timezone}
            />
          </div>

          <aside className="flex flex-col gap-6">
            <Panel title="Details" bodyClassName="px-4 pb-4 md:px-5">
              <dl className="grid grid-cols-[96px_1fr] gap-y-2.5 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <ProjectStatusBadge status={project.status as ProjectStatus} />
                </dd>
                <dt className="text-muted-foreground">Owner</dt>
                <dd className={owner ? "text-foreground" : "text-muted-foreground"}>
                  {personLabel(owner)}
                </dd>
                <dt className="text-muted-foreground">Department</dt>
                <dd className="text-foreground">
                  {department?.name ?? "—"}
                  {department?.archived && (
                    <span className="ml-1 text-xs text-muted-foreground">(archived)</span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Start</dt>
                <dd className="text-foreground">
                  {project.start_date ? fmt(project.start_date) : "—"}
                </dd>
                <dt className="text-muted-foreground">Due</dt>
                <dd className="text-foreground">
                  {project.due_date ? fmt(project.due_date) : "—"}
                </dd>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-foreground">{fmt(project.created_at)}</dd>
              </dl>
            </Panel>

            <Panel
              title="Activity"
              description="Everything that changed, newest first."
              bodyClassName="pb-2"
            >
              <ActivityFeed
                formatDate={fmt}
                items={activity.map((e) => ({
                  id: e.id,
                  kind: e.kind,
                  payload: e.payload,
                  actorName: e.actorName,
                  when: timeAgo(e.createdAt, now, workspace.timezone),
                  whenExact: formatDateTime(e.createdAt, workspace.timezone),
                }))}
              />
            </Panel>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
