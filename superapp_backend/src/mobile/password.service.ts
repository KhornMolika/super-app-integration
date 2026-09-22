import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const N = 1 << 15; // 32768
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
// scrypt needs ~128*N*r bytes; leave headroom so Node does not reject it.
const maxmemFor = (n: number, r: number, p: number) =>
  128 * n * r * p + 16 * 1024 * 1024;
// Upper bounds on parameters read back from storage (defence against a
// tampered/corrupted row forcing an enormous allocation).
const MAX_N = 1 << 20;
const MAX_R = 32;
const MAX_P = 16;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

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

@Injectable()
export class PasswordService {
  private dummyHash?: string;

  /** Returns a policy violation message, or null when acceptable. */
  validatePolicy(raw: unknown, email?: string): string | null {
    if (typeof raw !== 'string') return 'Password is required';
    // Length is measured on the same NFKC form that is actually hashed.
    const password = raw.normalize('NFKC');
    if (password.length < PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
    }
    if (
      email &&
      password.trim().toLowerCase() === email.normalize('NFKC').trim().toLowerCase()
    ) {
      return 'Password must not be the same as your email';
    }
    return null;
  }

  async hash(password: string): Promise<string> {
    const salt = crypto.randomBytes(SALT_LEN);
    const key = await scryptAsync(password, salt, KEY_LEN, N, R, P);
    return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const parts = typeof stored === 'string' ? stored.split('$') : [];
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
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

  /** True when the stored hash uses weaker parameters than the current ones. */
  needsRehash(stored: string): boolean {
    const parts = stored.split('$');
    return (
      parts.length !== 6 ||
      parts[0] !== 'scrypt' ||
      Number(parts[1]) < N ||
      Number(parts[2]) < R ||
      Number(parts[3]) < P
    );
  }

  /**
   * Burns the same CPU as a real verification. Used when the account does not
   * exist / is locked so response timing does not reveal it.
   */
  async verifyDummy(password: string): Promise<void> {
    // Cache only a successful hash (never a rejected promise).
    let dummy = this.dummyHash;
    if (!dummy) {
      dummy = await this.hash(crypto.randomBytes(16).toString('hex'));
      this.dummyHash = dummy;
    }
    await this.verify(password, dummy);
  }
}
