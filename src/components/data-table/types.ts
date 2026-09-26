import type { RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";

import type { ColumnKind } from "@/lib/table/filters";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "right";
  }
}

export interface EnumOption {
  value: string;
  label: string;
}

/**
 * Column definition for the shared DataTable (docs/PLAN.md §8). `accessor`
 * returns the comparable value used for sorting and filtering: ISO dates for
 * `date`, the raw value for `enum`, display text for `text`. `cell` renders it.
 */
export interface DataTableColumn<Row> {
  id: string;
  header: string;
  kind: ColumnKind;
  accessor: (row: Row) => string | null;
  cell?: (row: Row) => ReactNode;
  /** Labels for enum values; counts come from the rows. */
  enumOptions?: EnumOption[];
  /** Label shown for null enum values in filters ("Unassigned"). */
  noneLabel?: string;
  defaultWidth?: number;
  minWidth?: number;
  defaultHidden?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  /** Render the header/cell right-aligned (numbers, dates). */
  align?: "left" | "right";
}

export interface DataTableGroup<Row> {
  id: string;
  label: string;
  /** Fractional rank of the group itself, for group drag. */
  rank: string;
  rows: Row[];
  /** Small text after the label, e.g. "archived". */
  note?: string;
}

export interface RowMove {
  rowId: string;
  fromGroupId: string;
  toGroupId: string;
  /** New fractional rank within the target group's shared/personal order. */
  rank: string;
}

export interface GroupMove {
  groupId: string;
  rank: string;
}

export interface LastLayoutChange {
  by: string;
  at: string;
}

export const DND_TYPES = {
  row: "row",
  column: "column",
  group: "group",
} as const;

export type DndType = (typeof DND_TYPES)[keyof typeof DND_TYPES];

export interface RowDragData {
  type: typeof DND_TYPES.row;
  rowId: string;
  groupId: string;
}
export interface ColumnDragData {
  type: typeof DND_TYPES.column;
  columnId: string;
}
export interface GroupDragData {
  type: typeof DND_TYPES.group;
  groupId: string;
}
export type DragData = RowDragData | ColumnDragData | GroupDragData;
