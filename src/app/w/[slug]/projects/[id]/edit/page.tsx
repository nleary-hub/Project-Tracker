import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageBody, PageHeader } from "@/components/page-header";
import { requireWorkspace } from "@/lib/auth/dal";
import { getPeople, isMyPerson, personOptions } from "@/lib/data/people";
import { getDepartments, getProject } from "@/lib/data/projects";
import type { ProjectStatus } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

import { updateProject } from "../../actions";
import { ProjectForm } from "../../project-form";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({
  params,
}: PageProps<"/w/[slug]/projects/[id]/edit">) {
  const { slug, id } = await params;
  const ctx = await requireWorkspace(slug);
  const supabase = await createClient();
  const result = await getProject(supabase, ctx.workspace.id, id);
  if (!result) notFound();
  const { project } = result;

  const [departments, people] = await Promise.all([
    getDepartments(supabase, ctx.workspace.id),
    getPeople(supabase, ctx.workspace.id),
  ]);
  if (!ctx.isAdmin && !isMyPerson(people, project.owner_id, ctx.user.id)) {
    redirect(`/w/${slug}/projects/${id}`);
  }
  // Keep the project's current department selectable even if it was archived.
  const options = departments.filter((d) => !d.archived || d.id === project.department_id);

  return (
    <>
      <PageHeader title={`Edit ${project.name}`} />
      <PageBody>
        <ProjectForm
          action={updateProject.bind(null, slug, id)}
          slug={slug}
          departments={options.map((d) => ({
            value: d.id,
            label: d.archived ? `${d.name} (archived)` : d.name,
          }))}
          people={personOptions(people)}
          initial={{
            name: project.name,
            departmentId: project.department_id,
            ownerId: project.owner_id,
            status: project.status as ProjectStatus,
            startDate: project.start_date,
            dueDate: project.due_date,
            description: project.description,
          }}
          cancelHref={`/w/${slug}/projects/${id}`}
          submitLabel="Save changes"
        />
      </PageBody>
    </>
  );
}
