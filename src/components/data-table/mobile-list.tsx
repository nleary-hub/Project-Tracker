"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { type ColumnFilter, type FilterState, countActiveFilters } from "@/lib/table/filters";
import type { SortRule } from "@/lib/table/layout";

import { FilterChips, FilterEditor } from "./filter-editor";
import type { DataTableColumn, DataTableGroup } from "./types";

/**
 * Phone layout (docs/PLAN.md §7, §8): one stacked card per row, and a
 * "Sort & filter" panel instead of column headers. No dragging or resizing.
 */
export function MobileList<Row>({
  columns,
  groups,
  filters,
  sort,
  counts,
  renderCard,
  onFilterChange,
  onClearFilters,
  onSortChange,
  emptyMessage,
}: {
  columns: DataTableColumn<Row>[];
  groups: { group: DataTableGroup<Row>; rows: Row[] }[];
  filters: FilterState;
  sort: SortRule[];
  counts: (columnId: string) => Map<string | null, number>;
  renderCard: (row: Row) => ReactNode;
  onFilterChange: (columnId: string, filter: ColumnFilter | null) => void;
  onClearFilters: () => void;
  onSortChange: (sort: SortRule[]) => void;
  emptyMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filters);
  const sortable = columns.filter((c) => c.sortable !== false);
  const current = sort[0];
  const sortValue = current ? `${current.desc ? "-" : ""}${current.id}` : "none";
  const sortItems = [
    { value: "none", label: "Manual order" },
    ...sortable.flatMap((c) => [
      { value: c.id, label: `${c.header} ↑` },
      { value: `-${c.id}`, label: `${c.header} ↓` },
    ]),
  ];
  const total = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <FilterChips
          columns={columns}
          filters={filters}
          onRemove={(id) => onFilterChange(id, null)}
          onClearAll={onClearFilters}
        />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="sm" className="ml-auto" />}>
            <SlidersHorizontalIcon />
            Sort &amp; filter{active > 0 ? ` (${active})` : ""}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Sort &amp; filter</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-5 px-4 pb-6">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Sort by</span>
                <Select
                  items={sortItems}
                  value={sortValue}
                  onValueChange={(v) => {
                    if (typeof v !== "string") return;
                    if (v === "none") onSortChange([]);
                    else onSortChange([{ id: v.replace(/^-/, ""), desc: v.startsWith("-") }]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortItems.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {columns
                .filter((c) => c.filterable !== false)
                .map((c) => (
                  <div key={c.id} className="flex flex-col gap-1.5 border-t border-border pt-4">
                    <span className="text-xs font-medium text-muted-foreground">{c.header}</span>
                    <FilterEditor
                      column={c}
                      value={filters[c.id]}
                      counts={counts(c.id)}
                      onChange={(f) => onFilterChange(c.id, f)}
                    />
                  </div>
                ))}
              <Button onClick={() => setOpen(false)}>
                Show {total} {total === 1 ? "result" : "results"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {total === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        groups
          .filter((g) => g.rows.length > 0)
          .map(({ group, rows }) => (
            <section key={group.id} aria-label={group.label} className="flex flex-col gap-2">
              <h2 className="flex items-baseline gap-2 text-sm font-semibold text-foreground">
                {group.label}
                <span className="text-xs font-normal text-muted-foreground">{rows.length}</span>
              </h2>
              <ul className="flex flex-col gap-2">
                {rows.map((row, i) => (
                  <li key={i}>{renderCard(row)}</li>
                ))}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}
