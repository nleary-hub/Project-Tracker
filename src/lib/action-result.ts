/** Return shape for Server Actions used with `useActionState`. */
export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export type ActionState<T = undefined> = ActionResult<T> | null;

export function fail(error: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

export function succeed<T>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function fieldError(state: ActionState<unknown>, field: string): string | undefined {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[field]?.[0];
}
