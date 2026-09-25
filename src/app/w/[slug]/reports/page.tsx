import type { Metadata } from "next";

import { ComingSoon, PageBody, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Biweekly portfolio reports and their history." />
      <PageBody>
        <ComingSoon milestone="M6">
          Report snapshots, live preview, Generate now, and PDF, Excel and CSV exports.
        </ComingSoon>
      </PageBody>
    </>
  );
}
