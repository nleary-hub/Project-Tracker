import type { Metadata } from "next";

import { HealthBadge } from "@/components/health-badge";
import { ComingSoon, PageBody, PageHeader } from "@/components/page-header";
import { HEALTH_STATUSES, INACTIVE_STATUSES } from "@/lib/health";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Portfolio health and the work that needs you." />
      <PageBody>
        <section
          aria-labelledby="legend-heading"
          className="mb-6 rounded-sm border border-border bg-surface p-4"
        >
          <h2
            id="legend-heading"
            className="mb-3 text-xs font-semibold tracking-wide text-ink-muted uppercase"
          >
            Health legend
          </h2>
          <ul className="flex flex-wrap gap-2">
            {[...HEALTH_STATUSES, ...INACTIVE_STATUSES].map((status) => (
              <li key={status}>
                <HealthBadge status={status} />
              </li>
            ))}
            <li>
              <HealthBadge status="at_risk" override />
            </li>
          </ul>
        </section>
        <ComingSoon milestone="M2–M6">
          Portfolio charts, projects needing your update, and your open tasks and milestones.
        </ComingSoon>
      </PageBody>
    </>
  );
}
