/**
 * People vocabulary (docs/PLAN.md D31): owners and assignees are people in the
 * workspace directory. A person may be linked to a signed-in user or exist
 * only as a name (and optional email) for someone who never logs in.
 */

export interface PersonOption {
  value: string;
  label: string;
  /** Linked to a signed-in user (workspace member). */
  member?: boolean;
}

export const UNKNOWN_PERSON = "Unknown person";

export function personLabel(
  person: { name: string } | undefined | null,
  fallback = "Unassigned",
): string {
  return person ? person.name : fallback;
}

/** Label for a person id looked up in a list; missing ids render as unknown. */
export function labelFor(
  people: readonly PersonOption[] | ReadonlyMap<string, string>,
  id: string | null | undefined,
): string {
  if (!id) return "Unassigned";
  const label =
    people instanceof Map
      ? people.get(id)
      : (people as readonly PersonOption[]).find((p) => p.value === id)?.label;
  return label ?? UNKNOWN_PERSON;
}
