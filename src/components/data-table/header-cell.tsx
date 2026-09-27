"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Header } from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeOffIcon,
  FilterIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  RulerIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ColumnFilter } from "@/lib/table/filters";
import { cn } from "@/lib/utils";

import { FilterEditor } from "./filter-editor";
import { DND_TYPES, type DataTableColumn } from "./types";

export interface HeaderCellProps<Item, Row> {
  header: Header<Item, unknown>;
  column: DataTableColumn<Row>;
  sortIndex: number;
  sortDesc: boolean | null;
  sortLevels: number;
  filter: ColumnFilter | undefined;
  counts: Map<string | null, number>;
  canReorder: boolean;
  canResize: boolean;
  onSortClick: (event: React.MouseEvent) => void;
  onSetSort: (desc: boolean | null) => void;
  onFilterChange: (filter: ColumnFilter | null) => void;
  onHide: () => void;
  onResetWidth: () => void;
  onAutoFit: () => void;
  transition: { duration: number; easing: string } | null;
}

export function HeaderCell<Item, Row>({
  header,
  column,
  sortIndex,
  sortDesc,
  sortLevels,
  filter,
  counts,
  canReorder,
  canResize,
  onSortClick,
  onSetSort,
  onFilterChange,
  onHide,
  onResetWidth,
  onAutoFit,
  transition,
}: HeaderCellProps<Item, Row>) {
  const [filterOpen, setFilterOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
    transition: dndTransition,
  } = useSortable({
    id: `col:${column.id}`,
    data: { type: DND_TYPES.column, columnId: column.id },
    disabled: !canReorder,
    transition,
  });

  const sortable = column.sortable !== false;
  const filterable = column.filterable !== false;
  const sorted = sortDesc !== null;
  const ariaSort = sorted ? (sortDesc ? "descending" : "ascending") : undefined;

  return (
    <th
      ref={setNodeRef}
      data-col={column.id}
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        "group/th relative h-10 border-b border-border/80 bg-muted/40 px-0 text-left text-[12px] font-medium text-muted-foreground backdrop-blur-sm select-none",
        isDragging && "z-10 opacity-40",
      )}
      style={{
        width: header.getSize(),
        transform: CSS.Translate.toString(transform),
        transition: dndTransition,
      }}
    >
      <div className="flex h-full items-center">
        {/* Dragging and sorting are separate controls, like rows and groups:
            the grip moves the column, the label sorts it. */}
        {canReorder && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder the ${column.header} column`}
            title="Drag to reorder"
            data-testid="column-drag-handle"
            className="ml-1 flex h-6 w-4 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/50 transition-colors outline-none group-hover/th:text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
          >
            <GripVerticalIcon className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          data-testid="column-sort"
          disabled={!sortable}
          onClick={onSortClick}
          aria-label={`${column.header}${sortable ? ", sort" : ""}`}
          className={cn(
            "flex h-full min-w-0 flex-1 items-center gap-1 px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:cursor-default",
            canReorder && "pl-1",
            column.align === "right" && "justify-end",
          )}
        >
          <span className="truncate">{column.header}</span>
          {sorted && (
            <span className="flex shrink-0 items-center text-brand" aria-hidden="true">
              {sortDesc ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />}
              {sortLevels > 1 && (
                <span className="ml-0.5 text-[10px] tabular-nums">{sortIndex + 1}</span>
              )}
            </span>
          )}
          {filter && (
            <FilterIcon className="size-3 shrink-0 fill-brand text-brand" aria-label="Filtered" />
          )}
        </button>

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="mr-1 shrink-0 opacity-0 group-hover/th:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100"
                  aria-label={`${column.header} column options`}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {sortable && (
                <>
                  <DropdownMenuItem onClick={() => onSetSort(false)}>
                    <ArrowUpIcon />
                    Sort ascending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetSort(true)}>
                    <ArrowDownIcon />
                    Sort descending
                  </DropdownMenuItem>
                  {sorted && (
                    <DropdownMenuItem onClick={() => onSetSort(null)}>
                      <XIcon />
                      Clear sort
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}
              {filterable && (
                <DropdownMenuItem onClick={() => setFilterOpen(true)}>
                  <FilterIcon />
                  Filter…
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onHide}>
                <EyeOffIcon />
                Hide column
              </DropdownMenuItem>
              {canResize && (
                <DropdownMenuItem onClick={onResetWidth}>
                  <RulerIcon />
                  Reset width
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <PopoverTrigger
            nativeButton={false}
            render={<span className="absolute right-0 bottom-0 size-0" aria-hidden="true" />}
          />
          <PopoverContent align="end" className="w-64">
            <p className="text-xs font-medium text-muted-foreground">Filter {column.header}</p>
            <FilterEditor
              column={column}
              value={filter}
              counts={counts}
              onChange={onFilterChange}
              onClose={() => setFilterOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {canResize && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${column.header} column`}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onDoubleClick={onAutoFit}
          title="Drag to resize · double-click to fit"
          className={cn(
            "absolute top-0 right-0 z-10 h-full w-3 cursor-col-resize touch-none select-none",
            "after:absolute after:inset-y-1.5 after:right-1 after:w-[2px] after:rounded-full after:bg-border after:transition-colors",
            "hover:after:bg-brand/70",
            header.column.getIsResizing() && "after:bg-brand",
          )}
        />
      )}
    </th>
  );
}
