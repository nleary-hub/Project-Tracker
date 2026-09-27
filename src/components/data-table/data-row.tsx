"use client";

import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender, type Cell } from "@tanstack/react-table";
import { GripVerticalIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { DND_TYPES, type GroupStyle } from "./types";

export interface RowResizeHandlers {
  onPointerDown: (event: React.PointerEvent) => void;
  onDoubleClick: () => void;
}

export function DataRow<Item>({
  rowId,
  groupId,
  height,
  canDrag,
  nested,
  dragLabel,
  resize,
  transition,
  cells,
}: {
  rowId: string;
  groupId: string;
  height: number;
  canDrag: boolean;
  /** Indented under its group header, with a guide line (tasks under a milestone). */
  nested: boolean;
  dragLabel: string;
  resize: RowResizeHandlers | null;
  transition: { duration: number; easing: string } | null;
  cells: Cell<Item, unknown>[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
    transition: dndTransition,
  } = useSortable({
    id: `row:${rowId}`,
    data: { type: DND_TYPES.row, rowId, groupId },
    disabled: !canDrag,
    transition,
  });

  return (
    <tr
      ref={setNodeRef}
      data-row-id={rowId}
      data-group-id={groupId}
      data-testid="data-row"
      className={cn(
        "group/row relative bg-card transition-colors hover:bg-accent/40 [&>td]:border-b [&>td]:border-border/60 last:[&>td]:border-b-0",
        isDragging && "opacity-0",
      )}
      style={{
        height,
        transform: CSS.Translate.toString(transform),
        transition: dndTransition,
      }}
    >
      {cells.map((cell, index) => (
        <td
          key={cell.id}
          data-col={cell.column.id}
          className={cn(
            "relative p-0 align-middle",
            index === 0 && (nested ? "pl-11" : "pl-6"),
            index === 0 &&
              nested &&
              "before:absolute before:inset-y-0 before:left-4 before:w-px before:bg-border",
          )}
          style={{ width: cell.column.getSize(), height }}
        >
          {index === 0 && canDrag && (
            <button
              ref={setActivatorNodeRef}
              type="button"
              {...attributes}
              {...listeners}
              aria-label={dragLabel}
              data-testid="row-drag-handle"
              className={cn(
                "absolute top-1/2 flex size-5 -translate-y-1/2 cursor-grab items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity outline-none group-hover/row:opacity-100 hover:bg-muted focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing",
                nested ? "left-6" : "left-1",
              )}
            >
              <GripVerticalIcon className="size-3.5" />
            </button>
          )}
          <div
            data-cell-content
            className={cn(
              "flex h-full min-w-0 items-center px-2 text-sm",
              cell.column.columnDef.meta?.align === "right" && "justify-end",
            )}
            style={{ height }}
          >
            <div className="min-w-0 flex-1 truncate">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          </div>
          {index === 0 && resize && (
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize row height"
              onPointerDown={resize.onPointerDown}
              onDoubleClick={resize.onDoubleClick}
              className="absolute inset-x-0 -bottom-0.5 z-10 h-1.5 cursor-row-resize touch-none opacity-0 group-hover/row:opacity-100 hover:bg-brand/30"
            />
          )}
        </td>
      ))}
    </tr>
  );
}

export function GroupHeaderRow({
  groupId,
  groupStyle,
  isFirst,
  label,
  note,
  count,
  colSpan,
  canDrag,
  collapsed,
  dropTarget,
  dropLabel,
  transition,
  children,
}: {
  groupId: string;
  groupStyle: GroupStyle;
  /** The first group needs no break above it; the table header is already there. */
  isFirst: boolean;
  label: string;
  note?: string;
  count: number;
  colSpan: number;
  canDrag: boolean;
  collapsed: boolean;
  dropTarget: boolean;
  dropLabel: string | null;
  transition: { duration: number; easing: string } | null;
  children?: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    setActivatorNodeRef,
    transform,
    isDragging,
    transition: dndTransition,
  } = useSortable({
    id: `group:${groupId}`,
    data: { type: DND_TYPES.group, groupId },
    disabled: !canDrag,
    transition,
  });
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `groupdrop:${groupId}`,
    data: { type: "groupDrop", groupId },
  });

  return (
    <tr
      ref={(node) => {
        setSortableRef(node);
        setDroppableRef(node);
      }}
      data-group-header={groupId}
      data-testid="group-header"
      className={cn(
        "transition-colors [&>th]:border-b",
        groupStyle === "section" && "bg-muted/60 [&>th]:h-11 [&>th]:border-border",
        // A band of page background plus a hairline: each department reads as its own block.
        groupStyle === "section" &&
          !isFirst &&
          "[&>th]:border-t-8 [&>th]:border-t-background [&>th]:shadow-[inset_0_1px_0_var(--border)]",
        groupStyle === "nested" && "bg-card [&>th]:h-10 [&>th]:border-border/60",
        dropTarget && "bg-brand-soft",
        isDragging && "opacity-60",
      )}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: dndTransition,
      }}
    >
      <th scope="rowgroup" colSpan={colSpan} className="px-2 text-left font-normal">
        <div className="flex items-center gap-2">
          {canDrag && (
            <button
              ref={setActivatorNodeRef}
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Drag to reorder ${label}`}
              data-testid="group-drag-handle"
              className="flex size-5 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
            >
              <GripVerticalIcon className="size-3.5" />
            </button>
          )}
          {groupStyle === "nested" && (
            <span
              aria-hidden="true"
              className="ml-[11px] size-2 rotate-45 rounded-[2px] bg-brand/70"
            />
          )}
          <span
            className={cn(
              "font-semibold text-foreground",
              groupStyle === "section" ? "text-sm" : "text-[13px]",
            )}
          >
            {label}
          </span>
          {note && (
            <span className="rounded-md bg-muted px-1.5 py-px text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {note}
            </span>
          )}
          <span className="rounded-full bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground tabular-nums">
            {count}
          </span>
          {collapsed && (
            <span className="text-xs text-muted-foreground">· collapsed while moving</span>
          )}
          {dropLabel && (
            <span className="ml-2 rounded-md bg-brand px-1.5 py-0.5 text-xs font-medium text-brand-ink shadow-xs">
              {dropLabel}
            </span>
          )}
          {children}
        </div>
      </th>
    </tr>
  );
}
