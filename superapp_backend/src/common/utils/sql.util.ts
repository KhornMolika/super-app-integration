/**
 * Escapes PostgreSQL LIKE/ILIKE wildcards (% and _) and backslashes in user search strings.
 * Prevents user input containing '%' or '_' from matching unintended substrings or triggering full scans.
 */
export function escapeLikeString(str: string): string {
  if (!str) return '';
  return str.replace(/[%_\\]/g, '\\$&');
}
