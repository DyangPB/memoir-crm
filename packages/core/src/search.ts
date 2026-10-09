export function buildSearchQuery(input: string): string | null {
  const terms = input
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  if (terms.length === 0) {
    return null;
  }

  return terms.map((term) => `"${term.replaceAll('"', '""')}"*`).join(" ");
}
