import type { Metadata } from "next";

import { ComingSoon, PageBody, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace, members, departments and report settings."
      />
      <PageBody>
        <ComingSoon milestone="M1">
          Members and invite links, departments, report schedule, charts, branding and layout
          sharing.
        </ComingSoon>
      </PageBody>
    </>
  );
}
