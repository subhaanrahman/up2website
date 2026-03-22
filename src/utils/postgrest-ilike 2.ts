/**
 * Build a PostgREST `.or()` fragment for two columns with the same ILIKE pattern.
 * The value is double-quoted so spaces and commas in the search term do not break parsing.
 * `%` and `_` are removed from user input so they are not treated as LIKE wildcards.
 * Double quotes in the term are escaped per PostgREST (`"` → `""`).
 */
export function buildDualColumnIlikeOr(columns: [string, string], rawTerm: string): string {
  const inner = rawTerm.trim().replace(/%/g, '').replace(/_/g, '').replace(/"/g, '""');
  const pattern = `%${inner}%`;
  const quoted = `"${pattern}"`;
  const [a, b] = columns;
  return `${a}.ilike.${quoted},${b}.ilike.${quoted}`;
}
