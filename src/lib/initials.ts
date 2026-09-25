/** Avatar fallback: "Riley Lee" → "RL"; with no name, derived from the email. */
export function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}
