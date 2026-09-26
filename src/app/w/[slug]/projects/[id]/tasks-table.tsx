"use client";

import { MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteTask,
  moveTaskRow,
  reorderTaskRows,
  setTaskStatus,
} from "@/app/w/[slug]/task-actions";
import { saveTableFilters, saveTableLayout } from "@/app/w/[slug]/table-layout-actions";
import { DataTable, type DataTablePermissions } from "@/components/data-table/data-table";
import type { DataTableColumn, DataTableGroup } from "@/components/data-table/types";
import { PriorityBadge, TaskStatusBadge } from "@/components/task-badges";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskRow } from "@/lib/data/tasks";
import { formatDate } from "@/lib/format";
import { type PersonOption, UNKNOWN_PERSON } from "@/lib/people";
import type { DateContext, FilterState } from "@/lib/table/filters";
import type { SortRule, TableLayout } from "@/lib/table/layout";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskStatus,
  isTaskOverdue,
  prioritySortKey,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";

import { EditTaskDialog, type MilestoneOption, NewTaskDialog, QuickAddTask } from "./task-form";

export interface TasksTableProps {
  slug: string;
  projectId: string;
  groups: DataTableGroup<TaskRow>[];
  milestones: MilestoneOption[];
  people: PersonOption[];
  layout: TableLayout;
  sort: SortRule[];
  filters: FilterState;
  dates: DateContext;
  timeZone: string;
  lastLayoutChange: { by: string; at: string } | null;
}

/**
 * The project's tasks, grouped by milestone, on the shared DataTable
 * (docs/PLAN.md §8). Dragging a task into another milestone reassigns it;
 * ticking the box completes it.
 */
export function TasksTable(props: TasksTableProps) {
  const { slug, projectId, people, milestones, timeZone, dates } = props;
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [deleting, setDeleting] = useState<TaskRow | null>(null);
  const personName = useMemo(() => new Map(people.map((p) => [p.value, p.label])), [people]);

  const columns = useMemo<DataTableColumn<TaskRow>[]>(
    () => [
      {
        id: "title",
        header: "Task",
        kind: "text",
        accessor: (t) => t.title,
        cell: (t) => (
          <TitleCell
            task={t}
            slug={slug}
            onEdit={() => setEditing(t)}
            onDelete={() => setDeleting(t)}
          />
        ),
        defaultWidth: 320,
        minWidth: 200,
      },
      {
        id: "status",
        header: "Status",
        kind: "enum",
        accessor: (t) => t.status,
        cell: (t) => <StatusCell task={t} slug={slug} />,
        enumOptions: TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] })),
        defaultWidth: 140,
      },
      {
        id: "priority",
        header: "Priority",
        kind: "enum",
        accessor: (t) => prioritySortKey(t.priority),
        cell: (t) => <PriorityBadge priority={t.priority} />,
        enumOptions: TASK_PRIORITIES.map((p) => ({
          value: prioritySortKey(p),
          label: TASK_PRIORITY_LABELS[p],
        })),
        defaultWidth: 120,
      },
      {
        id: "assignee",
        header: "Assignee",
        kind: "enum",
        accessor: (t) => t.assignee_id,
        cell: (t) => (
          <span className={cn(!t.assignee_id && "text-muted-foreground")}>
            {t.assignee_id ? (personName.get(t.assignee_id) ?? UNKNOWN_PERSON) : "Unassigned"}
          </span>
        ),
        enumOptions: people,
        noneLabel: "Unassigned",
        defaultWidth: 160,
      },
      {
        id: "due",
        header: "Due",
        kind: "date",
        accessor: (t) => t.due_date,
        cell: (t) => {
          if (!t.due_date) return <span className="text-muted-foreground">—</span>;
          const overdue = isTaskOverdue(t, dates.today);
          return (
            <span className={cn(overdue && "font-medium text-health-off-track")}>
              {overdue ? "Overdue · " : ""}
              {formatDate(t.due_date, timeZone)}
            </span>
          );
        },
        defaultWidth: 130,
      },
      {
        id: "created",
        header: "Created",
        kind: "date",
        accessor: (t) => t.created_at.slice(0, 10),
        cell: (t) => formatDate(t.created_at, timeZone),
        defaultWidth: 120,
        defaultHidden: true,
      },
      {
        id: "description",
        header: "Notes",
        kind: "text",
        accessor: (t) => t.description || null,
        defaultWidth: 320,
        defaultHidden: true,
        sortable: false,
      },
    ],
    [slug, people, personName, dates.today, timeZone],
  );

  const permissions = useMemo<DataTablePermissions<TaskRow>>(
    () => ({
      editLayout: true,
      reorderRows: true,
      reorderGroups: false,
      moveRowToGroup: () => true,
    }),
    [],
  );

  return (
    <div className="flex flex-col">
      <DataTable
        tableKey="tasks"
        columns={columns}
        groups={props.groups}
        getRowId={(t) => t.id}
        getRowRank={(t) => t.rank}
        getRowLabel={(t) => t.title}
        layout={props.layout}
        sort={props.sort}
        filters={props.filters}
        dates={dates}
        permissions={permissions}
        lastLayoutChange={props.lastLayoutChange}
        confirmGroupMove={false}
        emptyMessage="No tasks yet."
        renderCard={(t) => (
          <button
            type="button"
            onClick={() => setEditing(t)}
            className="panel block w-full px-3 py-2.5 text-left"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "font-medium text-foreground",
                  t.status === "done" && "text-muted-foreground line-through",
                )}
              >
                {t.title}
              </span>
              <TaskStatusBadge status={t.status} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <PriorityBadge priority={t.priority} />
              {t.assignee_id && <span>{personName.get(t.assignee_id) ?? UNKNOWN_PERSON}</span>}
              {t.due_date && (
                <span
                  className={cn(
                    isTaskOverdue(t, dates.today) && "font-medium text-health-off-track",
                  )}
                >
                  Due {formatDate(t.due_date, timeZone)}
                </span>
              )}
            </p>
          </button>
        )}
        onLayoutChange={(patch) => saveTableLayout(slug, "tasks", patch)}
        onFiltersChange={(filters) => saveTableFilters(slug, "tasks", filters)}
        onRowMove={(move) => moveTaskRow(slug, move)}
        onRowsReorder={(ranks) => reorderTaskRows(slug, ranks)}
        onGroupMove={async () => ({
          ok: false as const,
          error: "Milestones are ordered by due date.",
        })}
      />
      <div className="panel mt-2">
        <QuickAddTask slug={slug} projectId={projectId} onMore={() => setNewOpen(true)} />
      </div>

      <NewTaskDialog
        slug={slug}
        projectId={projectId}
        people={people}
        milestones={milestones}
        open={newOpen}
        onOpenChange={setNewOpen}
      />
      {editing && (
        <EditTaskDialog
          key={editing.id}
          slug={slug}
          taskId={editing.id}
          people={people}
          milestones={milestones}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          initial={{
            title: editing.title,
            description: editing.description,
            status: editing.status,
            priority: editing.priority,
            assigneeId: editing.assignee_id,
            milestoneId: editing.milestone_id,
            dueDate: editing.due_date,
          }}
        />
      )}
      <DeleteTaskDialog slug={slug} task={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

/** Opens the "new task" dialog from a header action. */
export function NewTaskButton({
  slug,
  projectId,
  people,
  milestones,
}: {
  slug: string;
  projectId: string;
  people: PersonOption[];
  milestones: MilestoneOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon />
        New task
      </Button>
      <NewTaskDialog
        slug={slug}
        projectId={projectId}
        people={people}
        milestones={milestones}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function TitleCell({
  task,
  slug,
  onEdit,
  onDelete,
}: {
  task: TaskRow;
  slug: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const done = task.status === "done";
  return (
    <span className="group/task flex w-full min-w-0 items-center gap-2.5">
      <Checkbox
        checked={done}
        disabled={pending}
        aria-label={`${done ? "Reopen" : "Complete"} ${task.title}`}
        className="rounded-full"
        onCheckedChange={(next) =>
          startTransition(async () => {
            const result = await setTaskStatus(slug, task.id, next ? "done" : "todo");
            if (result?.ok) toast.success(result.message);
            else toast.error(result?.error ?? "Couldn't update the task.");
          })
        }
      />
      <button
        type="button"
        onClick={onEdit}
        className={cn(
          "min-w-0 flex-1 truncate text-left font-medium text-foreground outline-none hover:underline focus-visible:underline",
          done && "text-muted-foreground line-through decoration-muted-foreground/60",
        )}
      >
        {task.title}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Actions for ${task.title}`}
              className="shrink-0 opacity-0 group-hover/task:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100"
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/** Status shown as a badge; click to change it in place. */
function StatusCell({ task, slug }: { task: TaskRow; slug: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={pending}
            aria-label={`Status: ${TASK_STATUS_LABELS[task.status]}. Change`}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-60"
          />
        }
      >
        <TaskStatusBadge status={task.status} className="cursor-pointer hover:bg-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {TASK_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            disabled={s === task.status}
            onClick={() =>
              startTransition(async () => {
                const result = await setTaskStatus(slug, task.id, s as TaskStatus);
                if (result?.ok) toast.success(result.message);
                else toast.error(result?.error ?? "Couldn't update the task.");
              })
            }
          >
            <TaskStatusBadge status={s} className="border-transparent bg-transparent px-0" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeleteTaskDialog({
  slug,
  task,
  onClose,
}: {
  slug: string;
  task: TaskRow | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog open={task !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {task?.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            This can&apos;t be undone. The deletion is recorded in the project&apos;s activity.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (!task) return;
                const result = await deleteTask(slug, task.id);
                if (result?.ok) toast.success(result.message);
                else toast.error(result?.error ?? "Couldn't delete the task.");
                onClose();
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
