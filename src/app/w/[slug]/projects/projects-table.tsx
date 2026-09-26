"use client";

import Link from "next/link";
import { useMemo } from "react";

import { DataTable, type DataTablePermissions } from "@/components/data-table/data-table";
import type {
  DataTableColumn,
  DataTableGroup,
  LastLayoutChange,
} from "@/components/data-table/types";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { Badge } from "@/components/ui/badge";
import type { ProjectListItem } from "@/lib/data/projects";
import { formatDate } from "@/lib/format";
import { type PersonOption, UNKNOWN_PERSON } from "@/lib/people";
import { type ProjectStatus, PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/projects";
import type { DateContext, FilterState } from "@/lib/table/filters";
import type { SortRule, TableLayout } from "@/lib/table/layout";
import { cn } from "@/lib/utils";

import {
  moveDepartmentGroup,
  moveProjectRow,
  reorderProjectRows,
  saveProjectsFilters,
  saveProjectsLayout,
} from "./table-actions";

export interface ProjectsTableProps {
  slug: string;
  groups: DataTableGroup<ProjectListItem>[];
  people: PersonOption[];
  layout: TableLayout;
  sort: SortRule[];
  filters: FilterState;
  dates: DateContext;
  timeZone: string;
  currentPersonId: string | null;
  isAdmin: boolean;
  mode: "shared" | "split" | "personal";
  lastLayoutChange: LastLayoutChange | null;
}

export function ProjectsTable(props: ProjectsTableProps) {
  const { slug, timeZone, dates, currentPersonId, isAdmin, mode } = props;
  const personName = useMemo(
    () => new Map(props.people.map((p) => [p.value, p.label])),
    [props.people],
  );
  const base = `/w/${slug}/projects`;

  const columns = useMemo<DataTableColumn<ProjectListItem>[]>(
    () => [
      {
        id: "name",
        header: "Project",
        kind: "text",
        accessor: (p) => p.name,
        cell: (p) => (
          <span className="flex items-center gap-2">
            <Link
              href={`${base}/${p.id}`}
              className="truncate font-medium text-ink hover:underline"
            >
              {p.name}
            </Link>
            {p.is_demo && <Badge variant="outline">Demo</Badge>}
          </span>
        ),
        defaultWidth: 240,
        minWidth: 160,
      },
      {
        id: "owner",
        header: "Owner",
        kind: "enum",
        accessor: (p) => p.owner_id,
        cell: (p) => (
          <span className={cn(!p.owner_id && "text-ink-muted")}>
            {p.owner_id ? (personName.get(p.owner_id) ?? UNKNOWN_PERSON) : "Unassigned"}
          </span>
        ),
        enumOptions: props.people,
        noneLabel: "Unassigned",
        defaultWidth: 160,
      },
      {
        id: "status",
        header: "Status",
        kind: "enum",
        accessor: (p) => p.status,
        cell: (p) => <ProjectStatusBadge status={p.status as ProjectStatus} />,
        enumOptions: PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] })),
        defaultWidth: 120,
      },
      {
        id: "nextMilestone",
        header: "Next milestone",
        kind: "text",
        accessor: (p) => p.nextMilestone?.name ?? null,
        cell: (p) =>
          p.nextMilestone ? (
            p.nextMilestone.name
          ) : (
            <span className="text-ink-muted">
              {p.status === "active" ? "No open milestones" : "—"}
            </span>
          ),
        defaultWidth: 200,
      },
      {
        id: "nextDue",
        header: "Milestone due",
        kind: "date",
        accessor: (p) => p.nextMilestone?.due_date ?? null,
        cell: (p) => {
          const due = p.nextMilestone?.due_date;
          if (!due) return <span className="text-ink-muted">—</span>;
          const overdue = due < dates.today;
          return (
            <span className={cn(overdue && "font-medium text-health-off-track")}>
              {overdue ? "Overdue · " : ""}
              {formatDate(due, timeZone)}
            </span>
          );
        },
        defaultWidth: 140,
      },
      {
        id: "due",
        header: "Due",
        kind: "date",
        accessor: (p) => p.due_date,
        cell: (p) =>
          p.due_date ? formatDate(p.due_date, timeZone) : <span className="text-ink-muted">—</span>,
        defaultWidth: 110,
      },
      {
        id: "start",
        header: "Start",
        kind: "date",
        accessor: (p) => p.start_date,
        cell: (p) =>
          p.start_date ? (
            formatDate(p.start_date, timeZone)
          ) : (
            <span className="text-ink-muted">—</span>
          ),
        defaultWidth: 120,
        defaultHidden: true,
      },
      {
        id: "description",
        header: "Description",
        kind: "text",
        accessor: (p) => p.description || null,
        defaultWidth: 320,
        defaultHidden: true,
        sortable: false,
      },
      {
        id: "created",
        header: "Created",
        kind: "date",
        accessor: (p) => p.created_at.slice(0, 10),
        cell: (p) => formatDate(p.created_at, timeZone),
        defaultWidth: 120,
        defaultHidden: true,
      },
    ],
    [base, personName, props.people, dates.today, timeZone],
  );

  // docs/PLAN.md §10: every member may change layouts and row order (shared
  // in "shared"/"split" mode, their own in "personal"); only admins reorder
  // departments; moving a project between departments follows edit rights.
  const permissions = useMemo<DataTablePermissions<ProjectListItem>>(
    () => ({
      editLayout: true,
      reorderRows: true,
      reorderGroups: isAdmin,
      moveRowToGroup: (p) =>
        isAdmin || (currentPersonId !== null && p.owner_id === currentPersonId),
    }),
    [isAdmin, currentPersonId],
  );

  return (
    <DataTable
      tableKey="projects"
      columns={columns}
      groups={props.groups}
      getRowId={(p) => p.id}
      getRowRank={(p) => p.rank}
      getRowLabel={(p) => p.name}
      layout={props.layout}
      sort={props.sort}
      filters={props.filters}
      dates={dates}
      permissions={permissions}
      lastLayoutChange={props.lastLayoutChange}
      emptyMessage="No projects yet."
      renderCard={(p) => (
        <Link
          href={`${base}/${p.id}`}
          className="block rounded-sm border border-border bg-surface px-3 py-2.5 hover:bg-surface-muted"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-ink">{p.name}</span>
            <ProjectStatusBadge status={p.status as ProjectStatus} />
          </div>
          <p className="mt-1 text-xs text-ink-secondary">
            {p.owner_id ? (personName.get(p.owner_id) ?? UNKNOWN_PERSON) : "Unassigned"}
            {p.nextMilestone && (
              <>
                {" · "}
                {p.nextMilestone.name}
                {p.nextMilestone.due_date && (
                  <span
                    className={cn(
                      p.nextMilestone.due_date < dates.today && "font-medium text-health-off-track",
                    )}
                  >
                    {" "}
                    · {formatDate(p.nextMilestone.due_date, timeZone)}
                  </span>
                )}
              </>
            )}
          </p>
        </Link>
      )}
      onLayoutChange={(patch) => saveProjectsLayout(slug, patch)}
      onFiltersChange={(filters) => saveProjectsFilters(slug, filters)}
      onRowMove={(move) => moveProjectRow(slug, move)}
      onRowsReorder={(ranks) => reorderProjectRows(slug, ranks)}
      onGroupMove={(move) => moveDepartmentGroup(slug, move)}
    />
  );
}
