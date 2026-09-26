import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

/**
 * Rank maths for drag-to-reorder (docs/PLAN.md §4 "Ordering", D26).
 * Rows carry a fractional-index `rank`; a move rewrites one row's rank.
 */

export interface Ranked {
  id: string;
  rank: string;
}

/**
 * The rank that places `movingId` at `targetIndex` within `rows` (given in
 * their current visual order), after the moving row is removed from the list.
 */
export function rankForMove(
  rows: readonly Ranked[],
  movingId: string,
  targetIndex: number,
): string {
  const others = rows.filter((r) => r.id !== movingId);
  const index = Math.max(0, Math.min(targetIndex, others.length));
  const before = index > 0 ? others[index - 1].rank : null;
  const after = index < others.length ? others[index].rank : null;
  return generateKeyBetween(before, after);
}

/** Fresh, evenly spaced ranks for a whole list, e.g. to persist a sorted order. */
export function ranksForOrder(ids: readonly string[]): Ranked[] {
  return generateNKeysBetween(null, null, ids.length).map((rank, i) => ({ id: ids[i], rank }));
}

/** Moves an item within an array (pure). */
export function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
