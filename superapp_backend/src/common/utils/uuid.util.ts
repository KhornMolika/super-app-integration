/**
 * Any value a PostgreSQL `uuid` column accepts in canonical form (8-4-4-4-12 hex).
 * Deliberately looser than RFC 4122 `isUUID`: rows created by migrations, seeds or
 * imports may carry ids without a valid version/variant nibble, and rejecting
 * them would make existing records unreachable.
 */
export const PG_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isPgUuid = (value: unknown): value is string =>
  typeof value === 'string' && PG_UUID_PATTERN.test(value);
