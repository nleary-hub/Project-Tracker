import { PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ComingSoon, PageBody, PageHeader } from "@/components/page-header";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/lib/auth/dal";
import { getPeople, isMyPerson, personOptions } from "@/lib/data/people";
import { getDepartments, getProject } from "@/lib/data/projects";
import { formatDate } from "@/lib/format";
import { sortForDisplay } from "@/lib/milestones";
import { personLabel } from "@/lib/people";
import { type ProjectStatus, todayInTimezone } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

import { MilestonesPanel } from "./milestones-panel";
import { ProjectMenu } from "./project-menu";

export async function generateMetadata({
  params,
}: PageProps<"/w/[slug]/projects/[id]">): Promise<Metadata> {
  const { slug, id } = await params;
  const ctx = await requireWorkspace(slug);
  const supabase = await createClient();
  const result = await getProject(supabase, ctx.workspace.id, id);
  return { title: result?.project.name ?? "Project" };
}

export default async function ProjectPage({ params }: PageProps<"/w/[slug]/projects/[id]">) {
  const { slug, id } = await params;
  const ctx = await requireWorkspace(slug);
  const { workspace } = ctx;
  const supabase = await createClient();

  const result = await getProject(supabase, workspace.id, id);
  if (!result) notFound();
  const { project, milestones } = result;

  const [departments, people] = await Promise.all([
    getDepartments(supabase, workspace.id),
    getPeople(supabase, workspace.id),
  ]);
  const department = departments.find((d) => d.id === project.department_id);
  const owner = people.find((p) => p.id === project.owner_id);
  const canEdit = ctx.isAdmin || isMyPerson(people, project.owner_id, ctx.user.id);
  const today = todayInTimezone(workspace.timezone);
  const peopleOptions = personOptions(people);

  return (
    <>
      <PageHeader
        title={project.name}
        description={
          <>
            <Link
              href={`/w/${slug}/projects?department=${project.department_id}`}
              className="hover:underline"
            >
              {department?.name ?? "No department"}
            </Link>
            {" · "}
            {owner ? owner.name : <span className="text-ink-muted">No owner</span>}
          </>
        }
        actions={
          canEdit && (
            <>
              <Button
                variant="outline"
                render={<Link href={`/w/${slug}/projects/${id}/edit`} />}
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
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex flex-col gap-8">
            {project.description ? (
              <p className="max-w-3xl text-sm whitespace-pre-line text-ink-secondary">
                {project.description}
              </p>
            ) : (
              canEdit && (
                <p className="text-sm text-ink-muted">
                  No description yet.{" "}
                  <Link
                    href={`/w/${slug}/projects/${id}/edit`}
                    className="underline underline-offset-4"
                  >
                    Add one
                  </Link>
                  .
                </p>
              )
            )}

            <MilestonesPanel
              slug={slug}
              projectId={id}
              milestones={sortForDisplay(milestones)}
              people={peopleOptions}
              canEdit={canEdit}
              today={today}
              timeZone={workspace.timezone}
            />

            <ComingSoon milestone="M4–M5">
              Updates from the owner, tasks, and the activity feed for this project.
            </ComingSoon>
          </div>

          <aside className="lg:border-l lg:border-border lg:pl-8">
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-ink-muted uppercase">
              Details
            </h2>
            <dl className="grid grid-cols-[96px_1fr] gap-y-2.5 text-sm">
              <dt className="text-ink-muted">Status</dt>
              <dd>
                <ProjectStatusBadge status={project.status as ProjectStatus} />
              </dd>
              <dt className="text-ink-muted">Owner</dt>
              <dd className={owner ? "text-ink" : "text-ink-muted"}>{personLabel(owner)}</dd>
              <dt className="text-ink-muted">Department</dt>
              <dd className="text-ink">
                {department?.name ?? "—"}
                {department?.archived && (
                  <span className="ml-1 text-xs text-ink-muted">(archived)</span>
                )}
              </dd>
              <dt className="text-ink-muted">Start</dt>
              <dd className="text-ink">
                {project.start_date ? formatDate(project.start_date, workspace.timezone) : "—"}
              </dd>
              <dt className="text-ink-muted">Due</dt>
              <dd className="text-ink">
                {project.due_date ? formatDate(project.due_date, workspace.timezone) : "—"}
              </dd>
              <dt className="text-ink-muted">Created</dt>
              <dd className="text-ink">{formatDate(project.created_at, workspace.timezone)}</dd>
              {project.is_demo && (
                <>
                  <dt className="text-ink-muted">Sample</dt>
                  <dd>
                    <Badge variant="outline">Demo data</Badge>
                  </dd>
                </>
              )}
            </dl>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
