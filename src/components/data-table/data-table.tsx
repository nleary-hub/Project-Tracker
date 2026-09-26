"use client";

import {
  type Announcements,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnSizingState,
  type Row as TableRowModel,
  type SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Columns3Icon, RotateCcwIcon } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionState } from "@/lib/action-result";
import {
  type ColumnFilter,
  type DateContext,
  type FilterState,
  isEmptyFilter,
  matchesFilter,
  writeFiltersToParams,
} from "@/lib/table/filters";
import {
  DENSITY_ROW_HEIGHT,
  type Density,
  type SortRule,
  type TableLayout,
  clampRowHeight,
  cycleSort,
  effectiveRowHeight,
  emptyLayout,
  encodeSort,
  orderedColumnIds,
} from "@/lib/table/layout";
import { type Ranked, arrayMove, rankForMove, ranksForOrder } from "@/lib/table/reorder";
import { cn } from "@/lib/utils";

import { DataRow, GroupHeaderRow } from "./data-row";
import { DragMarker, type MarkerPosition } from "./drag-marker";
import { FilterChips } from "./filter-editor";
import { HeaderCell } from "./header-cell";
import { typedKeyboardCoordinates } from "./keyboard-coordinates";
import { MobileList } from "./mobile-list";
import {
  DND_TYPES,
  type DataTableColumn,
  type DataTableGroup,
  type DragData,
  type GroupMove,
  type LastLayoutChange,
  type RowMove,
} from "./types";
import { useIsMobile, useReducedMotion } from "./use-reduced-motion";

/** One table row: the caller's row plus the ordering facts the table maintains. */
interface Item<Row> {
  id: string;
  groupId: string;
  rank: string;
  row: Row;
}

export interface DataTablePermissions<Row> {
  editLayout: boolean;
  reorderRows: boolean;
  reorderGroups: boolean;
  moveRowToGroup: (row: Row) => boolean;
}

export interface DataTableProps<Row> {
  tableKey: string;
  columns: DataTableColumn<Row>[];
  /** Groups in display order; rows inside each group in their current order. */
  groups: DataTableGroup<Row>[];
  getRowId: (row: Row) => string;
  getRowRank: (row: Row) => string;
  getRowLabel: (row: Row) => string;
  layout: TableLayout;
  /** Initial sort, already merged with the URL by the caller. */
  sort: SortRule[];
  filters: FilterState;
  dates: DateContext;
  permissions: DataTablePermissions<Row>;
  lastLayoutChange?: LastLayoutChange | null;
  renderCard: (row: Row) => ReactNode;
  emptyMessage: string;
  /** Ask before moving a row into another group (default true). */
  confirmGroupMove?: boolean;
  /** Toast shown when permissions.moveRowToGroup says no. */
  moveDeniedMessage?: string;
  onLayoutChange: (patch: Partial<TableLayout>) => Promise<ActionState>;
  onFiltersChange: (filters: FilterState) => Promise<ActionState>;
  onRowMove: (move: RowMove) => Promise<ActionState>;
  onRowsReorder: (ranks: Ranked[]) => Promise<ActionState>;
  onGroupMove: (move: GroupMove) => Promise<ActionState>;
}

const DENSITY_ITEMS: { value: Density | "custom"; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "comfortable", label: "Comfortable" },
];

const SORT_TRANSITION = { duration: 180, easing: "cubic-bezier(0.25, 1, 0.5, 1)" };

function toItems<Row>(
  groups: DataTableGroup<Row>[],
  getRowId: (r: Row) => string,
  getRowRank: (r: Row) => string,
) {
  return groups.flatMap((g) =>
    g.rows.map((row) => ({ id: getRowId(row), groupId: g.id, rank: getRowRank(row), row })),
  );
}

function compareRank(a: { rank: string }, b: { rank: string }) {
  return a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0;
}

export function DataTable<Row>(props: DataTableProps<Row>) {
  const {
    columns,
    groups,
    getRowId,
    getRowRank,
    getRowLabel,
    layout,
    dates,
    permissions,
    lastLayoutChange,
    renderCard,
    emptyMessage,
    onLayoutChange,
    onFiltersChange,
    onRowMove,
    onRowsReorder,
    onGroupMove,
  } = props;

  // A stable id keeps dnd-kit's aria-describedby identical on server and client.
  const dndId = useId();
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? null : SORT_TRANSITION;
  const [, startTransition] = useTransition();

  // ---- rows and groups (optimistic copies of the props) ----------------------
  const [sourceGroups, setSourceGroups] = useState(groups);
  const [items, setItems] = useState(() => toItems(groups, getRowId, getRowRank));
  const [groupOrder, setGroupOrder] = useState(() => groups.map((g) => g.id));
  if (sourceGroups !== groups) {
    setSourceGroups(groups);
    setItems(toItems(groups, getRowId, getRowRank));
    setGroupOrder(groups.map((g) => g.id));
  }
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const orderedGroups = useMemo(
    () =>
      groupOrder.map((id) => groupById.get(id)).filter((g): g is DataTableGroup<Row> => Boolean(g)),
    [groupOrder, groupById],
  );
  const orderedItems = useMemo(() => {
    const groupIndex = new Map(groupOrder.map((id, i) => [id, i]));
    return [...items].sort(
      (a, b) =>
        (groupIndex.get(a.groupId) ?? 0) - (groupIndex.get(b.groupId) ?? 0) || compareRank(a, b),
    );
  }, [items, groupOrder]);

  // ---- layout state ----------------------------------------------------------
  const defaultColumnIds = useMemo(() => columns.map((c) => c.id), [columns]);
  const [columnOrder, setColumnOrder] = useState(() =>
    orderedColumnIds(defaultColumnIds, layout.columnOrder),
  );
  const [hidden, setHidden] = useState<string[]>(() =>
    layout.hiddenColumns.length || layout.columnOrder.length
      ? layout.hiddenColumns
      : columns.filter((c) => c.defaultHidden).map((c) => c.id),
  );
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(layout.columnWidths);
  const [sorting, setSorting] = useState<SortingState>(props.sort);
  const [density, setDensity] = useState<Density>(layout.density);
  const [rowHeightPx, setRowHeightPx] = useState<number | null>(layout.rowHeightPx);
  const [filters, setFilters] = useState<FilterState>(props.filters);
  const rowHeight = effectiveRowHeight({ density, rowHeightPx });
  // True only after hydration; tests wait for it before dragging.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Every save writes the whole layout, so a stored row is always complete
  // (a first save that only carried column order would otherwise unhide the
  // default-hidden columns).
  const latestLayout = useRef<TableLayout>({
    columnOrder,
    columnWidths: columnSizing,
    hiddenColumns: hidden,
    sort: sorting,
    density,
    rowHeightPx,
  });
  latestLayout.current = {
    columnOrder,
    columnWidths: columnSizing,
    hiddenColumns: hidden,
    sort: sorting,
    density,
    rowHeightPx,
  };
  const persistLayout = useCallback(
    (patch: Partial<TableLayout>) => {
      const snapshot = { ...latestLayout.current, ...patch };
      latestLayout.current = snapshot;
      startTransition(async () => {
        const result = await onLayoutChange(snapshot);
        if (result && !result.ok) toast.error(result.error);
      });
    },
    [onLayoutChange],
  );

  const sizingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSizingSoon = useCallback(
    (sizing: ColumnSizingState) => {
      if (sizingTimer.current) clearTimeout(sizingTimer.current);
      sizingTimer.current = setTimeout(() => persistLayout({ columnWidths: sizing }), 400);
    },
    [persistLayout],
  );

  const filtersTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncUrl = useCallback((nextFilters: FilterState, nextSort: SortRule[]) => {
    const url = new URL(window.location.href);
    writeFiltersToParams(url.searchParams, nextFilters);
    const encoded = encodeSort(nextSort);
    if (encoded) url.searchParams.set("sort", encoded);
    else url.searchParams.delete("sort");
    // Pass `null` state: Next.js patches replaceState to keep the App Router's
    // URL in sync, but skips the sync when handed its own internal state object
    // (it assumes the call came from the router). Without the sync, the next
    // server-action refresh would restore the stale URL and drop our params.
    window.history.replaceState(null, "", url.toString());
  }, []);

  const applyFilters = useCallback(
    (next: FilterState) => {
      setFilters(next);
      syncUrl(next, sorting);
      if (filtersTimer.current) clearTimeout(filtersTimer.current);
      filtersTimer.current = setTimeout(() => {
        startTransition(async () => {
          await onFiltersChange(next);
        });
      }, 500);
    },
    [onFiltersChange, sorting, syncUrl],
  );

  const setColumnFilter = useCallback(
    (columnId: string, filter: ColumnFilter | null) => {
      const next = { ...filters };
      if (!filter || isEmptyFilter(filter)) delete next[columnId];
      else next[columnId] = filter;
      applyFilters(next);
    },
    [filters, applyFilters],
  );

  const applySort = useCallback(
    (next: SortRule[]) => {
      setSorting(next);
      persistLayout({ sort: next });
      syncUrl(filters, next);
    },
    [filters, persistLayout, syncUrl],
  );

  // ---- TanStack table --------------------------------------------------------
  const columnById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const columnDefs = useMemo<ColumnDef<Item<Row>, string | undefined>[]>(
    () =>
      columns.map((c) => ({
        id: c.id,
        accessorFn: (item) => c.accessor(item.row) ?? undefined,
        header: c.header,
        cell: (ctx) => (c.cell ? c.cell(ctx.row.original.row) : (ctx.getValue() ?? "—")),
        size: c.defaultWidth ?? 160,
        minSize: c.minWidth ?? 64,
        enableSorting: c.sortable !== false,
        sortUndefined: "last",
        sortingFn:
          c.kind === "text"
            ? (a, b, id) => String(a.getValue(id) ?? "").localeCompare(String(b.getValue(id) ?? ""))
            : "basic",
        filterFn: (row, id, filter: ColumnFilter) =>
          matchesFilter(row.getValue<string | undefined>(id) ?? null, filter, dates),
        meta: { align: c.align },
      })),
    [columns, dates],
  );
  const columnFilters = useMemo<ColumnFiltersState>(
    () => Object.entries(filters).map(([id, value]) => ({ id, value })),
    [filters],
  );
  const columnVisibility = useMemo(
    () => Object.fromEntries(hidden.map((id) => [id, false])),
    [hidden],
  );

  const table = useReactTable({
    data: orderedItems,
    columns: columnDefs,
    state: { sorting, columnFilters, columnOrder, columnVisibility, columnSizing },
    onSortingChange: setSorting,
    onColumnSizingChange: (updater) => {
      setColumnSizing((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        persistSizingSoon(next);
        return next;
      });
    },
    getRowId: (item) => item.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onChange",
    enableColumnResizing: permissions.editLayout,
    enableMultiSort: true,
    isMultiSortEvent: (e) => (e as MouseEvent).shiftKey,
  });

  const visibleRows = table.getRowModel().rows;
  const rowsByGroup = useMemo(() => {
    const map = new Map<string, TableRowModel<Item<Row>>[]>();
    for (const r of visibleRows) {
      const list = map.get(r.original.groupId) ?? [];
      list.push(r);
      map.set(r.original.groupId, list);
    }
    return map;
  }, [visibleRows]);
  const visibleColumnIds = table.getVisibleLeafColumns().map((c) => c.id);
  const totalWidth = table.getTotalSize();
  const filtering = Object.keys(filters).length > 0;

  const countsFor = useCallback(
    (columnId: string) => {
      const column = columnById.get(columnId);
      const counts = new Map<string | null, number>();
      if (!column) return counts;
      for (const item of items) {
        const v = column.accessor(item.row);
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      return counts;
    },
    [columnById, items],
  );

  // ---- column actions --------------------------------------------------------
  function hideColumn(id: string) {
    const next = [...hidden, id];
    setHidden(next);
    persistLayout({ hiddenColumns: next });
  }
  function setColumnVisible(id: string, visible: boolean) {
    const next = visible ? hidden.filter((h) => h !== id) : [...hidden, id];
    setHidden(next);
    persistLayout({ hiddenColumns: next });
  }
  function resetWidth(id: string) {
    setColumnSizing((prev) => {
      const next = { ...prev };
      delete next[id];
      persistLayout({ columnWidths: next });
      return next;
    });
  }
  const wrapperRef = useRef<HTMLDivElement>(null);
  function autoFit(id: string) {
    const root = wrapperRef.current;
    if (!root) return;
    let widest = 0;
    root
      .querySelectorAll<HTMLElement>(`td[data-col="${id}"] [data-cell-content] > div`)
      .forEach((el) => {
        widest = Math.max(widest, el.scrollWidth);
      });
    const header = root.querySelector<HTMLElement>(`th[data-col="${id}"] button > span`);
    widest = Math.max(widest, header?.scrollWidth ?? 0);
    const size = Math.max(columnById.get(id)?.minWidth ?? 64, Math.ceil(widest) + 40);
    setColumnSizing((prev) => {
      const next = { ...prev, [id]: size };
      persistLayout({ columnWidths: next });
      return next;
    });
  }
  function resetLayout() {
    setColumnOrder(defaultColumnIds);
    setHidden(columns.filter((c) => c.defaultHidden).map((c) => c.id));
    setColumnSizing({});
    setSorting([]);
    setDensity("default");
    setRowHeightPx(null);
    syncUrl(filters, []);
    persistLayout(emptyLayout());
  }
  function changeDensity(value: unknown) {
    if (value !== "compact" && value !== "default" && value !== "comfortable") return;
    setDensity(value);
    setRowHeightPx(null);
    persistLayout({ density: value, rowHeightPx: null });
  }

  // ---- row height drag -------------------------------------------------------
  const rowResize = permissions.editLayout
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          e.preventDefault();
          const startY = e.clientY;
          const startHeight = rowHeight;
          let latest = startHeight;
          const move = (ev: PointerEvent) => {
            latest = clampRowHeight(startHeight + ev.clientY - startY);
            setRowHeightPx(latest);
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            persistLayout({ rowHeightPx: latest });
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        },
        onDoubleClick: () => {
          const root = wrapperRef.current;
          if (!root) return;
          let tallest = 0;
          root.querySelectorAll<HTMLElement>("td [data-cell-content] > div").forEach((el) => {
            tallest = Math.max(tallest, el.scrollHeight);
          });
          const fitted = clampRowHeight(Math.max(DENSITY_ROW_HEIGHT.compact, tallest + 16));
          setRowHeightPx(fitted);
          persistLayout({ rowHeightPx: fitted });
        },
      }
    : null;

  // ---- drag and drop ---------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: typedKeyboardCoordinates }),
  );
  const [active, setActive] = useState<DragData | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);
  const [marker, setMarker] = useState<MarkerPosition | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    item: Item<Row>;
    toGroupId: string;
    targetIds: string[];
    targetIndex: number;
  } | null>(null);
  const sortedAtStart = useRef(false);

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const type = (args.active.data.current as DragData | undefined)?.type;
    const containers = args.droppableContainers.filter((c) => {
      const t = (c.data.current as { type?: string } | undefined)?.type;
      if (type === DND_TYPES.row) return t === DND_TYPES.row || t === "groupDrop";
      return t === type;
    });
    return closestCenter({ ...args, droppableContainers: containers });
  }, []);

  function visibleIdsOf(groupId: string) {
    return (rowsByGroup.get(groupId) ?? []).map((r) => r.original.id);
  }

  function handleDragStart({ active: a }: DragStartEvent) {
    const data = a.data.current as DragData;
    setActive(data);
    sortedAtStart.current = sorting.length > 0;
  }

  function handleDragOver({ active: a, over }: DragOverEvent) {
    const data = a.data.current as DragData;
    const wrapper = wrapperRef.current?.getBoundingClientRect();
    if (!over || !wrapper) {
      setMarker(null);
      setOverGroupId(null);
      return;
    }
    const overData = over.data.current as
      (DragData | { type: "groupDrop"; groupId: string }) | undefined;
    const activeRect = a.rect.current.translated;
    const overRect = over.rect;

    if (data.type === DND_TYPES.row) {
      const targetGroup = overData && "groupId" in overData ? overData.groupId : null;
      setOverGroupId(targetGroup);
      if (overData?.type === DND_TYPES.row && activeRect) {
        const below = activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2;
        setMarker({
          orientation: "horizontal",
          offset: (below ? overRect.bottom : overRect.top) - wrapper.top,
          start: 0,
          length: wrapper.width,
        });
      } else {
        setMarker({
          orientation: "horizontal",
          offset: overRect.bottom - wrapper.top,
          start: 0,
          length: wrapper.width,
        });
      }
    } else if (data.type === DND_TYPES.column && activeRect) {
      const right = activeRect.left + activeRect.width / 2 > overRect.left + overRect.width / 2;
      setMarker({
        orientation: "vertical",
        offset: (right ? overRect.right : overRect.left) - wrapper.left,
        start: 0,
        length: wrapper.height,
      });
    } else if (data.type === DND_TYPES.group && activeRect) {
      const below = activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2;
      setMarker({
        orientation: "horizontal",
        offset: (below ? overRect.bottom : overRect.top) - wrapper.top,
        start: 0,
        length: wrapper.width,
      });
    }
  }

  function clearDrag() {
    setActive(null);
    setOverGroupId(null);
    setMarker(null);
  }

  function handleDragEnd({ active: a, over }: DragEndEvent) {
    const data = a.data.current as DragData;
    const overData = over?.data.current as
      (DragData | { type: "groupDrop"; groupId: string }) | undefined;
    clearDrag();
    if (!over || a.id === over.id) return;

    if (data.type === DND_TYPES.column && overData?.type === DND_TYPES.column) {
      const from = visibleColumnIds.indexOf(data.columnId);
      const to = visibleColumnIds.indexOf(overData.columnId);
      if (from < 0 || to < 0) return;
      const nextVisible = arrayMove(visibleColumnIds, from, to);
      // Keep hidden columns where they were, relative to their visible neighbours.
      const next = columnOrder.filter((id) => !visibleColumnIds.includes(id));
      let insertAt = 0;
      for (const id of nextVisible) {
        next.splice(insertAt, 0, id);
        insertAt = next.indexOf(id) + 1;
      }
      setColumnOrder(next);
      persistLayout({ columnOrder: next });
      return;
    }

    if (data.type === DND_TYPES.group && overData?.type === DND_TYPES.group) {
      const from = groupOrder.indexOf(data.groupId);
      const to = groupOrder.indexOf(overData.groupId);
      if (from < 0 || to < 0) return;
      const previous = groupOrder;
      const nextOrder = arrayMove(groupOrder, from, to);
      const ranked = groupOrder.map((id) => ({ id, rank: groupById.get(id)?.rank ?? "" }));
      const rank = rankForMove(ranked, data.groupId, to);
      setGroupOrder(nextOrder);
      startTransition(async () => {
        const result = await onGroupMove({ groupId: data.groupId, rank });
        if (result && !result.ok) {
          setGroupOrder(previous);
          toast.error(result.error);
        } else {
          toast.success(`Moved ${groupById.get(data.groupId)?.label ?? "group"}.`);
        }
      });
      return;
    }

    if (data.type !== DND_TYPES.row || !overData) return;
    if (overData.type !== DND_TYPES.row && overData.type !== "groupDrop") return;
    const item = items.find((i) => i.id === data.rowId);
    if (!item) return;
    const toGroupId = overData.groupId;
    const groupIds = visibleIdsOf(toGroupId);
    const targetIds = groupIds.filter((id) => id !== item.id);
    let targetIndex = targetIds.length;
    if (overData.type === DND_TYPES.row) {
      if (toGroupId === item.groupId) {
        // Sortable semantics: the row takes the place of the row it was dropped on.
        targetIndex = groupIds.indexOf(overData.rowId);
      } else {
        // Into another group: before or after the row, depending on which half was hit.
        const overIndex = targetIds.indexOf(overData.rowId);
        const activeRect = a.rect.current.translated;
        const below = activeRect
          ? activeRect.top + activeRect.height / 2 > over.rect.top + over.rect.height / 2
          : false;
        targetIndex = overIndex + (below ? 1 : 0);
      }
    }

    if (toGroupId !== item.groupId) {
      if (!permissions.moveRowToGroup(item.row)) {
        toast.error(
          props.moveDeniedMessage ??
            "Only the project owner or an admin can move it to another department.",
        );
        return;
      }
      if (props.confirmGroupMove !== false) {
        setPendingMove({ item, toGroupId, targetIds, targetIndex });
        return;
      }
    }
    commitRowMove(item, toGroupId, targetIds, targetIndex);
  }

  function commitRowMove(
    item: Item<Row>,
    toGroupId: string,
    targetIds: string[],
    targetIndex: number,
  ) {
    const label = getRowLabel(item.row);
    const previous = { groupId: item.groupId, rank: item.rank };
    const targetRanked = targetIds.map((id) => ({
      id,
      rank: items.find((i) => i.id === id)?.rank ?? "",
    }));

    if (sortedAtStart.current) {
      // Dragging while sorted: the visible order becomes the manual order (D26).
      const order = [...targetIds];
      order.splice(targetIndex, 0, item.id);
      const ranks = ranksForOrder(order);
      const before = items
        .filter((i) => order.includes(i.id))
        .map((i) => ({ id: i.id, rank: i.rank }));
      const rankById = new Map(ranks.map((r) => [r.id, r.rank]));
      setItems((prev) =>
        prev.map((i) =>
          rankById.has(i.id)
            ? { ...i, rank: rankById.get(i.id)!, groupId: i.id === item.id ? toGroupId : i.groupId }
            : i,
        ),
      );
      setSorting([]);
      syncUrl(filters, []);
      persistLayout({ sort: [] });
      startTransition(async () => {
        if (toGroupId !== previous.groupId) {
          const moved = await onRowMove({
            rowId: item.id,
            fromGroupId: previous.groupId,
            toGroupId,
            rank: rankById.get(item.id)!,
          });
          if (moved && !moved.ok) return rollback(moved.error);
        }
        const result = await onRowsReorder(ranks);
        if (result && !result.ok) return rollback(result.error);
        toast(`Moved ${label}. Sorting is off; this is the new order.`, {
          duration: 8000,
          action: { label: "Undo", onClick: () => undoReorder(before, previous, item) },
        });
      });
      return;
    }

    const rank = rankForMove(targetRanked, item.id, targetIndex);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, groupId: toGroupId, rank } : i)),
    );
    startTransition(async () => {
      const result = await onRowMove({
        rowId: item.id,
        fromGroupId: previous.groupId,
        toGroupId,
        rank,
      });
      if (result && !result.ok) return rollback(result.error);
      const target = groupById.get(toGroupId)?.label;
      toast(toGroupId !== previous.groupId ? `Moved ${label} to ${target}.` : `Moved ${label}.`, {
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...previous } : i)));
            startTransition(async () => {
              const r = await onRowMove({
                rowId: item.id,
                fromGroupId: toGroupId,
                toGroupId: previous.groupId,
                rank: previous.rank,
              });
              if (r && !r.ok) toast.error(r.error);
            });
          },
        },
      });
    });

    function rollback(message: string) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...previous } : i)));
      toast.error(message);
    }
  }

  function undoReorder(
    before: Ranked[],
    previous: { groupId: string; rank: string },
    item: Item<Row>,
  ) {
    const rankById = new Map(before.map((r) => [r.id, r.rank]));
    setItems((prev) =>
      prev.map((i) =>
        rankById.has(i.id)
          ? {
              ...i,
              rank: rankById.get(i.id)!,
              groupId: i.id === item.id ? previous.groupId : i.groupId,
            }
          : i,
      ),
    );
    startTransition(async () => {
      if (item.groupId !== previous.groupId) {
        await onRowMove({
          rowId: item.id,
          fromGroupId: item.groupId,
          toGroupId: previous.groupId,
          rank: previous.rank,
        });
      }
      const r = await onRowsReorder(before);
      if (r && !r.ok) toast.error(r.error);
    });
  }

  const announcements: Announcements = {
    onDragStart: ({ active: a }) => describe(a.data.current as DragData, "Picked up"),
    onDragOver: ({ active: a, over }) => {
      const data = a.data.current as DragData;
      if (!over) return `${describe(data, "Moving")} No longer over a drop target.`;
      return describe(data, "Moving", over.data.current as DragData);
    },
    onDragEnd: ({ active: a, over }) =>
      over
        ? describe(a.data.current as DragData, "Dropped", over.data.current as DragData)
        : "Drop cancelled.",
    onDragCancel: () => "Move cancelled. Nothing changed.",
  };
  function describe(
    data: DragData,
    verb: string,
    over?: DragData | { type: "groupDrop"; groupId: string },
  ) {
    if (data.type === DND_TYPES.row) {
      const item = items.find((i) => i.id === data.rowId);
      const groupId = over && "groupId" in over ? over.groupId : item?.groupId;
      const ids = groupId ? visibleIdsOf(groupId) : [];
      const position =
        over && over.type === DND_TYPES.row
          ? ids.indexOf(over.rowId) + 1
          : ids.indexOf(data.rowId) + 1;
      return `${verb} ${item ? getRowLabel(item.row) : "row"}. Position ${position || ids.length} of ${ids.length} in ${groupById.get(groupId ?? "")?.label ?? "group"}.`;
    }
    if (data.type === DND_TYPES.column) {
      const idx =
        visibleColumnIds.indexOf(
          over && over.type === DND_TYPES.column ? over.columnId : data.columnId,
        ) + 1;
      return `${verb} ${columnById.get(data.columnId)?.header ?? "column"} column. Position ${idx} of ${visibleColumnIds.length}.`;
    }
    const idx =
      groupOrder.indexOf(over && over.type === DND_TYPES.group ? over.groupId : data.groupId) + 1;
    return `${verb} ${groupById.get(data.groupId)?.label ?? "group"}. Position ${idx} of ${groupOrder.length}.`;
  }

  // ---- render ----------------------------------------------------------------
  if (isMobile) {
    return (
      <MobileList
        columns={columns}
        groups={orderedGroups.map((group) => ({
          group,
          rows: (rowsByGroup.get(group.id) ?? []).map((r) => r.original.row),
        }))}
        filters={filters}
        sort={sorting}
        counts={countsFor}
        renderCard={renderCard}
        onFilterChange={setColumnFilter}
        onClearFilters={() => applyFilters({})}
        onSortChange={applySort}
        emptyMessage={emptyMessage}
      />
    );
  }

  const activeItem =
    active?.type === DND_TYPES.row ? items.find((i) => i.id === active.rowId) : null;
  const densityValue = rowHeightPx !== null ? "custom" : density;
  const totalVisible = visibleRows.length;

  return (
    <div className="flex flex-col gap-2.5" data-testid="data-table" data-hydrated={hydrated}>
      <div className="flex min-h-8 flex-wrap items-center gap-2">
        <FilterChips
          columns={columns}
          filters={filters}
          onRemove={(id) => setColumnFilter(id, null)}
          onClearAll={() => applyFilters({})}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {lastLayoutChange && permissions.editLayout && (
            <span
              className="hidden text-xs text-muted-foreground lg:inline"
              data-testid="layout-last-changed"
            >
              Layout last changed by {lastLayoutChange.by}, {relativeTime(lastLayoutChange.at)}
            </span>
          )}
          <Select
            items={[
              ...DENSITY_ITEMS,
              ...(densityValue === "custom"
                ? [{ value: "custom" as const, label: `Custom (${rowHeight}px)` }]
                : []),
            ]}
            value={densityValue}
            onValueChange={changeDensity}
            disabled={!permissions.editLayout}
          >
            <SelectTrigger size="sm" aria-label="Row height" className="bg-card shadow-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DENSITY_ITEMS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" className="shadow-xs" />}
            >
              <Columns3Icon />
              Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                {columnOrder.map((id) => {
                  const c = columnById.get(id);
                  if (!c) return null;
                  const visible = !hidden.includes(id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={id}
                      checked={visible}
                      disabled={
                        !permissions.editLayout || (visible && visibleColumnIds.length === 1)
                      }
                      onCheckedChange={(checked) => setColumnVisible(id, Boolean(checked))}
                    >
                      {c.header}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {permissions.editLayout && (
            <Button variant="ghost" size="sm" onClick={resetLayout}>
              <RotateCcwIcon />
              Reset layout
            </Button>
          )}
        </div>
      </div>

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        modifiers={
          active?.type === DND_TYPES.column ? [restrictToHorizontalAxis] : [restrictToVerticalAxis]
        }
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Press Space to pick up. Use the arrow keys to move, Space to drop, and Escape to cancel.",
          },
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={clearDrag}
      >
        <div
          ref={wrapperRef}
          className="scroll-quiet relative overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs"
        >
          <DragMarker marker={marker} />
          <table
            className="border-separate border-spacing-0 text-sm"
            style={{ width: Math.max(totalWidth, 0), minWidth: "100%" }}
          >
            <thead className="sticky top-0 z-10">
              <SortableContext
                items={visibleColumnIds.map((id) => `col:${id}`)}
                strategy={horizontalListSortingStrategy}
              >
                <tr>
                  {table.getHeaderGroups()[0].headers.map((header) => {
                    const column = columnById.get(header.column.id)!;
                    const sortIndex = sorting.findIndex((s) => s.id === column.id);
                    return (
                      <HeaderCell
                        key={header.id}
                        header={header}
                        column={column}
                        sortIndex={sortIndex}
                        sortDesc={sortIndex >= 0 ? sorting[sortIndex].desc : null}
                        sortLevels={sorting.length}
                        filter={filters[column.id]}
                        counts={countsFor(column.id)}
                        canReorder={permissions.editLayout}
                        canResize={permissions.editLayout}
                        onSortClick={(e) => applySort(cycleSort(sorting, column.id, e.shiftKey))}
                        onSetSort={(desc) =>
                          applySort(
                            desc === null
                              ? sorting.filter((s) => s.id !== column.id)
                              : [{ id: column.id, desc }],
                          )
                        }
                        onFilterChange={(f) => setColumnFilter(column.id, f)}
                        onHide={() => hideColumn(column.id)}
                        onResetWidth={() => resetWidth(column.id)}
                        onAutoFit={() => autoFit(column.id)}
                        transition={transition}
                      />
                    );
                  })}
                </tr>
              </SortableContext>
            </thead>
            <SortableContext
              items={groupOrder.map((id) => `group:${id}`)}
              strategy={verticalListSortingStrategy}
            >
              {orderedGroups.map((group) => {
                const rows = rowsByGroup.get(group.id) ?? [];
                const collapsed = active?.type === DND_TYPES.group && active.groupId === group.id;
                const isDropTarget =
                  active?.type === DND_TYPES.row &&
                  overGroupId === group.id &&
                  activeItem?.groupId !== group.id;
                return (
                  <tbody key={group.id} data-group={group.id}>
                    <GroupHeaderRow
                      groupId={group.id}
                      label={group.label}
                      note={group.note}
                      count={rows.length}
                      colSpan={visibleColumnIds.length}
                      canDrag={permissions.reorderGroups}
                      collapsed={collapsed}
                      dropTarget={isDropTarget}
                      dropLabel={isDropTarget ? `Move to ${group.label}` : null}
                      transition={transition}
                    />
                    {!collapsed && (
                      <SortableContext
                        items={rows.map((r) => `row:${r.original.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={visibleColumnIds.length}
                              className="px-3 py-2 text-xs text-muted-foreground"
                              style={{ height: rowHeight }}
                            >
                              {filtering
                                ? `No matches in ${group.label}.`
                                : `Nothing in ${group.label} yet.`}
                            </td>
                          </tr>
                        ) : (
                          rows.map((r) => (
                            <DataRow
                              key={r.id}
                              rowId={r.original.id}
                              groupId={group.id}
                              height={rowHeight}
                              canDrag={permissions.reorderRows}
                              dragLabel={`Drag to reorder ${getRowLabel(r.original.row)}`}
                              resize={rowResize}
                              transition={transition}
                              cells={r.getVisibleCells()}
                            />
                          ))
                        )}
                      </SortableContext>
                    )}
                  </tbody>
                );
              })}
            </SortableContext>
          </table>
          {totalVisible === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {filtering ? "No rows match these filters." : emptyMessage}
            </p>
          )}
        </div>

        <DragOverlay dropAnimation={reduceMotion ? null : undefined}>
          {activeItem && (
            <div
              className={cn(
                "flex items-center rounded-xl border border-border/80 bg-card shadow-lg shadow-xs ring-1 ring-brand/30",
                !reduceMotion && "scale-[1.02]",
              )}
              style={{ height: rowHeight, width: totalWidth, opacity: 0.92 }}
            >
              {visibleColumnIds.map((id, i) => {
                const c = columnById.get(id)!;
                return (
                  <div
                    key={id}
                    className={cn("truncate px-2 text-sm", i === 0 && "pl-6")}
                    style={{ width: table.getColumn(id)?.getSize() }}
                  >
                    {c.cell ? c.cell(activeItem.row) : (c.accessor(activeItem.row) ?? "—")}
                  </div>
                );
              })}
            </div>
          )}
          {active?.type === DND_TYPES.column && (
            <div className="rounded-xl border border-border/80 bg-muted/40 px-2 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase shadow-lg shadow-xs">
              {columnById.get(active.columnId)?.header}
            </div>
          )}
          {active?.type === DND_TYPES.group && (
            <div
              className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground shadow-lg shadow-xs"
              style={{ width: totalWidth }}
            >
              {groupById.get(active.groupId)?.label}
              <span className="text-xs font-normal text-muted-foreground">
                {(rowsByGroup.get(active.groupId) ?? []).length} rows
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <AlertDialog
        open={pendingMove !== null}
        onOpenChange={(open) => !open && setPendingMove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move {pendingMove ? getRowLabel(pendingMove.item.row) : ""} to{" "}
              {pendingMove ? groupById.get(pendingMove.toGroupId)?.label : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              It leaves {pendingMove ? groupById.get(pendingMove.item.groupId)?.label : ""} and
              shows under the new department in every report from now on.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingMove)
                  commitRowMove(
                    pendingMove.item,
                    pendingMove.toGroupId,
                    pendingMove.targetIds,
                    pendingMove.targetIndex,
                  );
                setPendingMove(null);
              }}
            >
              Move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
