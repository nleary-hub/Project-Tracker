/** Same rule as the `workspaces.slug` check constraint. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
export const SLUG_MAX_LENGTH = 40;

/** "Acme Corp — Ops" → "acme-corp-ops". Strips accents, keeps a–z, 0–9 and hyphens. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}
