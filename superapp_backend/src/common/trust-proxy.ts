import { isIP } from 'net';

const NAMED_SUBNETS = new Set(['loopback', 'linklocal', 'uniquelocal']);

function isValidEntry(entry: string): boolean {
  if (NAMED_SUBNETS.has(entry)) return true;
  const [addr, prefix, ...rest] = entry.split('/');
  if (rest.length) return false;
  const family = isIP(addr);
  if (!family) return false;
  if (prefix === undefined) return true;
  if (!/^\d+$/.test(prefix)) return false;
  return Number(prefix) <= (family === 4 ? 32 : 128);
}

/**
 * Parses env TRUST_PROXY for Express `trust proxy`.
 *
 * Accepted: a positive integer hop COUNT ("1"), "false", Express's named
 * subnets (loopback | linklocal | uniquelocal) and comma-separated IP/CIDR
 * lists. Unset/empty -> undefined (leave Express default untouched).
 *
 * The boolean `true` is REJECTED (throws): it trusts every hop, so the client
 * can spoof the leftmost X-Forwarded-For value and choose its own `req.ip`,
 * which defeats IP rate limiting. "0" and anything unrecognised also throw.
 */
export function parseTrustProxy(
  raw: string | undefined,
): number | false | string[] | undefined {
  if (raw === undefined) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === '') return undefined;
  if (v === 'false') return false;
  if (v === 'true') {
    throw new Error(
      'TRUST_PROXY=true is unsafe (clients could spoof X-Forwarded-For and bypass rate limiting). Set the number of proxy hops (e.g. TRUST_PROXY=1), a named subnet (loopback|linklocal|uniquelocal) or an IP/CIDR list.',
    );
  }
  if (/^\d+$/.test(v)) {
    const n = Number(v);
    if (n >= 1) return n;
    throw new Error('TRUST_PROXY hop count must be a positive integer');
  }
  const entries = v.split(',').map((e) => e.trim());
  if (entries.every((e) => e && isValidEntry(e))) return entries;
  throw new Error(
    'TRUST_PROXY is invalid: use a positive hop count, "false", loopback|linklocal|uniquelocal or an IP/CIDR list',
  );
}
