/**
 * Milestone helpers (docs/PLAN.md D8): the "next milestone" of a project is the
 * earliest incomplete one by due date; undated milestones come last, then rank.
 */

export interface MilestoneLike {
  id: string;
  name: string;
  due_date: string | null;
  completed_at: string | null;
  rank: string;
}

export function compareMilestones<T extends MilestoneLike>(a: T, b: T): number {
  if (a.due_date !== b.due_date) {
    if (a.due_date === null) return 1;
    if (b.due_date === null) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  return a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0;
}

export function nextMilestone<T extends MilestoneLike>(milestones: readonly T[]): T | null {
  const open = milestones.filter((m) => m.completed_at === null);
  if (open.length === 0) return null;
  return [...open].sort(compareMilestones)[0];
}

/** Open milestones sorted for display: dated first (soonest first), undated last. */
export function sortForDisplay<T extends MilestoneLike>(milestones: readonly T[]): T[] {
  const open = milestones.filter((m) => m.completed_at === null).sort(compareMilestones);
  const done = milestones
    .filter((m) => m.completed_at !== null)
    .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1));
  return [...open, ...done];
}

export function isOverdue(milestone: MilestoneLike, today: string): boolean {
  return (
    milestone.completed_at === null && milestone.due_date !== null && milestone.due_date < today
  );
}
