import { Transform } from 'class-transformer';

/**
 * A boolean query parameter: true for true/'true'/1/'1', false for
 * false/'false'/0/'0', undefined when absent or anything else (no filter).
 *
 * Reads the raw value (obj[key]), not `value`: with enableImplicitConversion
 * (main.ts) class-transformer has already turned the string 'false' into
 * Boolean('false') === true by the time `value` reaches the transform.
 */
export const QueryBoolean = () =>
  Transform(({ obj, key }) => {
    const raw = obj?.[key];
    if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
    if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
    return undefined;
  });
