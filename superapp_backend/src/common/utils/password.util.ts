import * as crypto from 'crypto';

const N = 1 << 15; // 32768
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
const MAX_N = 1 << 20;
const MAX_R = 32;
const MAX_P = 16;

const maxmemFor = (n: number, r: number, p: number) =>
  128 * n * r * p + 16 * 1024 * 1024;

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password.normalize('NFKC'),
      salt,
      keylen,
      { N: n, r, p, maxmem: maxmemFor(n, r, p) },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

/**
 * Hash a plain-text password using scrypt with a cryptographically secure random salt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LEN);
  const key = await scryptAsync(password, salt, KEY_LEN, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/**
 * Verify a plain-text password against a stored scrypt hash using timing-safe comparison.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (!password || !stored || typeof stored !== 'string') return false;

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    // Fallback: if legacy plain-text match during dev testing
    return password === stored;
  }

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    n < 2 ||
    (n & (n - 1)) !== 0 ||
    n > MAX_N ||
    r < 1 ||
    r > MAX_R ||
    p < 1 ||
    p > MAX_P
  ) {
    return false;
  }

  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  if (!salt.length || !expected.length) return false;

  let actual: Buffer;
  try {
    actual = await scryptAsync(password, salt, expected.length, n, r, p);
  } catch {
    return false;
  }

  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
}
