import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageBody, PageHeader } from "@/components/page-header";
import { requireWorkspace } from "@/lib/auth/dal";
import { getWorkspaceMembers, memberLabel } from "@/lib/data/members";
import { getDepartments } from "@/lib/data/projects";
import { createClient } from "@/lib/supabase/server";

import { createProject } from "../actions";
import { ProjectForm } from "../project-form";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage({ params }: PageProps<"/w/[slug]/projects/new">) {
  const { slug } = await params;
  const ctx = await requireWorkspace(slug);
  const supabase = await createClient();
  const [departments, members] = await Promise.all([
    getDepartments(supabase, ctx.workspace.id),
    getWorkspaceMembers(supabase, ctx.workspace.id),
  ]);
  const active = departments.filter((d) => !d.archived);
  if (active.length === 0) redirect(`/w/${slug}/projects`);

  return (
    <>
      <PageHeader
        title="New project"
        description="Projects feed the biweekly report; keep the name short and recognizable."
      />
      <PageBody>
        <ProjectForm
          action={createProject.bind(null, slug)}
          departments={active.map((d) => ({ value: d.id, label: d.name }))}
          members={members.map((m) => ({ value: m.userId, label: memberLabel(m) }))}
          initial={{
            name: "",
            departmentId: active[0].id,
            ownerId: ctx.user.id,
            status: "active",
            startDate: null,
            dueDate: null,
            description: "",
          }}
          cancelHref={`/w/${slug}/projects`}
          submitLabel="Create project"
        />
      </PageBody>
    </>
  );
}
