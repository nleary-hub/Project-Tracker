"use client";

import { XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/projects";
import { UNASSIGNED } from "@/lib/schemas/project";

export interface FilterOption {
  value: string;
  label: string;
}

const ALL = "all";

/**
 * Filters live in the URL so a filtered view can be bookmarked or shared
 * (docs/PLAN.md §8). The full column-header filtering arrives with M3.
 */
export function ProjectsFilters({
  departments,
  members,
}: {
  departments: FilterOption[];
  members: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const department = params.get("department") ?? ALL;
  const owner = params.get("owner") ?? ALL;
  const status = params.get("status") ?? ALL;
  const active = [department, owner, status].some((v) => v !== ALL);

  function set(key: string, value: unknown) {
    const next = new URLSearchParams(params.toString());
    if (typeof value !== "string" || value === ALL) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const departmentItems = [{ value: ALL, label: "All departments" }, ...departments];
  const ownerItems = [
    { value: ALL, label: "All owners" },
    ...members,
    { value: UNASSIGNED, label: "Unassigned" },
  ];
  const statusItems = [
    { value: ALL, label: "All statuses" },
    ...PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter projects">
      <FilterSelect
        label="Department"
        items={departmentItems}
        value={department}
        onChange={(v) => set("department", v)}
      />
      <FilterSelect
        label="Owner"
        items={ownerItems}
        value={owner}
        onChange={(v) => set("owner", v)}
      />
      <FilterSelect
        label="Status"
        items={statusItems}
        value={status}
        onChange={(v) => set("status", v)}
      />
      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          <XIcon />
          Clear
        </Button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: FilterOption[];
  value: string;
  onChange: (value: unknown) => void;
}) {
  return (
    <Select items={items} value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" aria-label={label} className="min-w-40 bg-surface">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
