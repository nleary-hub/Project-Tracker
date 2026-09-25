import { generateKeyBetween } from "fractional-indexing";

/**
 * Fractional-index ranks (docs/PLAN.md §4 "Ordering"). Rows sort by `rank`
 * as plain text; moving a row rewrites only that row's rank.
 */
export function rankAfter(last: string | null | undefined): string {
  return generateKeyBetween(last ?? null, null);
}

export function rankBetween(before: string | null | undefined, after: string | null | undefined) {
  return generateKeyBetween(before ?? null, after ?? null);
}

export function byRank<T extends { rank: string }>(a: T, b: T): number {
  return a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0;
}
