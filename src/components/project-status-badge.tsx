import { HealthBadge } from "@/components/health-badge";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/projects";

/**
 * Active projects get a health rating (M5); every other status is shown as
 * the status itself, drawn like an inactive health badge (docs/PLAN.md §5, §7).
 */
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  if (status === "active") {
    return <Badge variant="secondary">{PROJECT_STATUS_LABELS.active}</Badge>;
  }
  return <HealthBadge status={status} />;
}
