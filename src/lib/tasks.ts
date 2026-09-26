/** Task vocabulary shared by forms, tables and the activity feed (docs/PLAN.md §4). */

export const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/** Higher number = more urgent; used for sorting the priority column. */
export const TASK_PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

export interface TaskLike {
  status: TaskStatus;
  due_date: string | null;
}

export function isOpenTask(task: Pick<TaskLike, "status">): boolean {
  return task.status !== "done";
}

export function isTaskOverdue(task: TaskLike, today: string): boolean {
  return isOpenTask(task) && task.due_date !== null && task.due_date < today;
}

/** Sort key so a "priority" column sorts urgent → low rather than alphabetically. */
export function prioritySortKey(priority: TaskPriority): string {
  return String(TASK_PRIORITY_WEIGHT[priority]);
}

/** Group id used by task tables for tasks that have no milestone. */
export const NO_MILESTONE_GROUP = "none";
