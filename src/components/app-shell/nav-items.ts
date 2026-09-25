import { BarChart3, FolderKanban, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  /** Path relative to the workspace root, "" for the dashboard. */
  segment: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", segment: "", icon: LayoutDashboard },
  { label: "Projects", segment: "projects", icon: FolderKanban },
  { label: "Reports", segment: "reports", icon: BarChart3 },
  { label: "Settings", segment: "settings", icon: Settings },
];

export function navHref(workspaceSlug: string, segment: string) {
  return segment ? `/w/${workspaceSlug}/${segment}` : `/w/${workspaceSlug}`;
}

/** The dashboard matches exactly; other sections also match their sub-pages. */
export function isActive(pathname: string, workspaceSlug: string, segment: string) {
  const href = navHref(workspaceSlug, segment);
  if (!segment) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
