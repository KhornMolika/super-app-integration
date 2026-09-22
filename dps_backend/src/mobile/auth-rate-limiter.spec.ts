import { HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRateLimitGuard, AuthRateLimiter, RATE_LIMIT_KEY } from './auth-rate-limiter';

describe('AuthRateLimiter', () => {
  it('allows up to max then reports seconds to wait, and resets after the window', () => {
    const l = new AuthRateLimiter();
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(l.consume('k', 3, 60_000, t0)).toBe(0);
    expect(l.consume('k', 3, 60_000, t0 + 1000)).toBe(59);
    expect(l.consume('other', 3, 60_000, t0)).toBe(0);
    expect(l.consume('k', 3, 60_000, t0 + 60_001)).toBe(0);
  });
});

describe('AuthRateLimiter memory bounds', () => {
  it('never evicts a blocked entry; when full of live keys, new keys are rejected (fail closed)', () => {
    const l = new AuthRateLimiter();
    l.maxKeys = 3;
    const t = 5_000;
    l.consume('victim', 1, 60_000, t);
    expect(l.consume('victim', 1, 60_000, t)).toBeGreaterThan(0); // blocked
    l.consume('a', 5, 60_000, t);
    l.consume('b', 5, 60_000, t);
    expect(l.size).toBe(3);
    expect(l.consume('flood-1', 5, 60_000, t)).toBeGreaterThan(0); // rejected, no eviction
    expect(l.size).toBe(3);
    expect(l.consume('victim', 1, 60_000, t + 1)).toBeGreaterThan(0); // still blocked
    // once entries expire, new keys are admitted again
    expect(l.consume('flood-1', 5, 60_000, t + 60_001)).toBe(0);
  });

  it('isFull is true only for a new key when at capacity', () => {
    const l = new AuthRateLimiter();
    l.maxKeys = 1;
    expect(l.isFull('a', 0)).toBe(false);
    l.consume('a', 5, 60_000, 0);
    expect(l.isFull('a', 1)).toBe(false);
    expect(l.isFull('b', 1)).toBe(true);
    expect(l.isFull('b', 60_001)).toBe(false); // expired entry swept
  });

  it('sweep work per call is bounded (<= 200 entries examined)', () => {
    const l = new AuthRateLimiter();
    for (let i = 0; i < 1000; i++) l.consume(`k${i}`, 5, 1000, 0);
    l.consume('trigger', 5, 1000, 5000);
    expect(l.size).toBeGreaterThanOrEqual(1000 - 200 + 1);
    expect(l.size).toBeLessThan(1001);
  });
});

describe('AuthRateLimitGuard', () => {
  const build = (opts: any) => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'get').mockImplementation((k) => (k === RATE_LIMIT_KEY ? opts : undefined));
    const guard = new AuthRateLimitGuard(new AuthRateLimiter(), reflector);
    const headers: Record<string, string> = {};
    const ctx = (ip: string, email?: string) =>
      ({
        getHandler: () => () => undefined,
        switchToHttp: () => ({
          getRequest: () => ({ ip, body: { email } }),
          getResponse: () => ({ setHeader: (k: string, v: string) => (headers[k] = v) }),
        }),
      }) as any;
    return { guard, ctx, headers };
  };

  it('429 + Retry-After after the per-IP limit', () => {
    const { guard, ctx, headers } = build({ scope: 's', ipMax: 2 });
    expect(guard.canActivate(ctx('1.1.1.1'))).toBe(true);
    expect(guard.canActivate(ctx('1.1.1.1'))).toBe(true);
    try {
      guard.canActivate(ctx('1.1.1.1'));
      fail('expected 429');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(429);
    }
    expect(Number(headers['Retry-After'])).toBeGreaterThan(0);
    expect(guard.canActivate(ctx('2.2.2.2'))).toBe(true);
  });

  it('limits per IP+email case-insensitively without blocking other emails', () => {
    const { guard, ctx } = build({ scope: 's', ipMax: 100, emailMax: 2 });
    guard.canActivate(ctx('1.1.1.1', 'A@x.io'));
    guard.canActivate(ctx('1.1.1.1', 'a@x.io'));
    expect(() => guard.canActivate(ctx('1.1.1.1', 'a@X.io'))).toThrow(HttpException);
    expect(guard.canActivate(ctx('1.1.1.1', 'b@x.io'))).toBe(true);
    expect(guard.canActivate(ctx('9.9.9.9', 'a@x.io'))).toBe(true);
  });
});
