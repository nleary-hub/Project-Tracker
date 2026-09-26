import { ArrowRightIcon, MilestoneIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActivityFeed } from "@/components/activity-feed";
import { MyTasksPanel } from "@/components/dashboard/my-tasks-panel";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ComingSoon, PageBody, PageHeader } from "@/components/page-header";
import { EmptyNote, Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { getProfile, requireWorkspace } from "@/lib/auth/dal";
import { getDashboardData } from "@/lib/data/dashboard";
import { myPersonId } from "@/lib/data/people";
import { formatDate, formatDateTime, timeAgo } from "@/lib/format";
import { todayInTimezone } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(now: Date, timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(now),
  );
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const ctx = await requireWorkspace(slug);
  const { workspace } = ctx;
  const supabase = await createClient();
  const now = new Date();
  const today = todayInTimezone(workspace.timezone, now);

  const [profile, personId] = await Promise.all([getProfile(), myPersonId(supabase, workspace.id)]);
  const data = await getDashboardData(supabase, { workspaceId: workspace.id, personId, today });
  const firstName = (profile.display_name || profile.email).split(/[\s@]/)[0];
  const base = `/w/${slug}`;
  const fmt = (d: string) => formatDate(d, workspace.timezone);

  const tiles = [
    {
      label: "Active projects",
      value: data.counts.activeProjects,
      icon: "projects" as const,
      href: `${base}/projects?f.status=active`,
      tone: "brand" as const,
    },
    {
      label: "Overdue milestones",
      value: data.counts.overdueMilestones,
      icon: "overdue" as const,
      href: `${base}/projects?f.nextDue=overdue`,
      tone: data.counts.overdueMilestones > 0 ? ("danger" as const) : ("neutral" as const),
    },
    {
      label: "Due in 7 days",
      value: data.counts.dueThisWeek,
      icon: "week" as const,
      href: `${base}/projects?f.nextDue=week`,
      tone: data.counts.dueThisWeek > 0 ? ("warn" as const) : ("neutral" as const),
      hint: "milestones",
    },
    {
      label: "My open tasks",
      value: data.counts.myOpenTasks,
      icon: "tasks" as const,
      href: "#my-tasks",
      tone: "neutral" as const,
      hint: data.counts.myOverdueTasks > 0 ? `${data.counts.myOverdueTasks} overdue` : undefined,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          timeZone: workspace.timezone,
        }).format(now)}
        title={`${greeting(now, workspace.timezone)}, ${firstName}`}
        description="Portfolio health and the work that needs you."
        actions={
          <Button render={<Link href={`${base}/projects/new`} />} nativeButton={false}>
            <PlusIcon />
            New project
          </Button>
        }
      />
      <PageBody className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((t, i) => (
            <StatTile key={t.label} index={i} {...t} />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <Panel
              id="my-tasks"
              title="My tasks"
              count={data.myTasks.length}
              description={personId ? "Open tasks assigned to you, soonest due first." : undefined}
            >
              <MyTasksPanel
                slug={slug}
                tasks={data.myTasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  priority: t.priority,
                  projectId: t.project_id,
                  projectName: t.projectName,
                  due: t.due_date ? fmt(t.due_date) : null,
                  overdue: t.due_date !== null && t.due_date < today,
                  blocked: t.status === "blocked",
                }))}
              />
            </Panel>

            <Panel
              title="Upcoming milestones"
              count={data.upcoming.length}
              description="Open milestones due in the next two weeks, overdue first."
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href={`${base}/projects`} />}
                  nativeButton={false}
                >
                  All projects
                  <ArrowRightIcon />
                </Button>
              }
            >
              {data.upcoming.length === 0 ? (
                <EmptyNote icon={MilestoneIcon} title="Nothing due soon">
                  Milestones with a due date in the next 14 days appear here.
                </EmptyNote>
              ) : (
                <ul className="divide-y divide-border/70">
                  {data.upcoming.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 md:px-5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          m.overdue ? "bg-health-off-track" : "bg-health-at-risk",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          <Link
                            href={`${base}/projects/${m.projectId}`}
                            className="hover:text-foreground hover:underline"
                          >
                            {m.projectName}
                          </Link>
                          {m.ownerName && <> · {m.ownerName}</>}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums",
                          m.overdue
                            ? "bg-health-off-track/10 font-medium text-health-off-track"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {m.overdue ? "Overdue · " : ""}
                        {fmt(m.dueDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <ComingSoon milestone="M5–M6">
              Portfolio health charts and the &ldquo;projects needing your update&rdquo; banner
              arrive with the health engine and reports.
            </ComingSoon>
          </div>

          <Panel
            title="Recent activity"
            description="Across every project in the workspace."
            bodyClassName="pb-2"
            className="xl:sticky xl:top-6 xl:self-start"
          >
            <ActivityFeed
              formatDate={fmt}
              items={data.activity.map((e) => ({
                id: e.id,
                kind: e.kind,
                payload: e.payload,
                actorName: e.actorName,
                when: timeAgo(e.createdAt, now, workspace.timezone),
                whenExact: formatDateTime(e.createdAt, workspace.timezone),
                project: {
                  id: e.projectId,
                  name: e.projectName,
                  href: `${base}/projects/${e.projectId}`,
                },
              }))}
              emptyBody="Complete a task or move a milestone and it shows up here."
            />
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
