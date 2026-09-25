import type { Metadata } from "next";

import { ComingSoon, PageBody, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" description="Every project, grouped by department." />
      <PageBody>
        <ComingSoon milestone="M2–M3">
          The projects table: grouped by department, with header sorting and filters,
          drag-to-reorder and resizable columns.
        </ComingSoon>
      </PageBody>
    </>
  );
}
