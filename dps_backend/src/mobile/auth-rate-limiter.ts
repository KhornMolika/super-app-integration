import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

const WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_KEYS = 50_000;
/** Entries examined per call when purging expired ones (bounded work). */
const SWEEP_BUDGET = 200;
export const FULL_RETRY_AFTER_SECONDS = 60;

/**
 * Fixed-window in-memory limiter.
 *
 * NOTE: state is PER INSTANCE. With N replicas the effective limit is N x the
 * configured one; use a shared store (Redis) or an edge/WAF limit if you scale
 * out. Behind a reverse proxy `req.ip` is the proxy address unless Express
 * `trust proxy` is configured (env TRUST_PROXY), which collapses all clients
 * into one IP bucket.
 *
 * Memory is bounded by `maxKeys`. Expired entries are purged incrementally
 * (<= SWEEP_BUDGET per call). An entry that is currently blocking
 * (count >= max, not yet expired) is NEVER evicted; if the map is full of live
 * entries, NEW keys are rejected as limited instead (fail closed).
 */
@Injectable()
export class AuthRateLimiter {
  private readonly hits = new Map<
    string,
    { count: number; resetAt: number }
  >();

  /** Public so tests can shrink it (a ctor param would confuse Nest DI). */
  maxKeys = DEFAULT_MAX_KEYS;

  /** Returns 0 when allowed, otherwise the seconds to wait (Retry-After). */
  consume(
    key: string,
    max: number,
    windowMs = WINDOW_MS,
    now = Date.now(),
  ): number {
    this.sweep(now);
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (!entry && this.hits.size >= this.maxKeys) {
        return FULL_RETRY_AFTER_SECONDS;
      }
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      return 0;
    }
    if (entry.count >= max) {
      return Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    }
    entry.count += 1;
    return 0;
  }

  /** True when `key` is new and the map has no room (consume() would fail closed). */
  isFull(key: string, now = Date.now()): boolean {
    this.sweep(now);
    const e = this.hits.get(key);
    return !e && this.hits.size >= this.maxKeys;
  }

  get size(): number {
    return this.hits.size;
  }

  reset(): void {
    this.hits.clear();
  }

  /** Deletes expired entries among the first SWEEP_BUDGET (oldest-inserted). */
  private sweep(now: number): void {
    let examined = 0;
    for (const [k, v] of this.hits) {
      if (examined++ >= SWEEP_BUDGET) break;
      if (v.resetAt <= now) this.hits.delete(k);
    }
  }
}

/** 429 raised by services (controller copies retryAfterSeconds to Retry-After). */
export class RateLimitedException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super('Too many attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
  }
}

export interface RateLimitOptions {
  scope: string;
  ipMax: number;
  /** Max attempts per IP+email pair (only when the body carries an email). */
  emailMax?: number;
}

export const RATE_LIMIT_KEY = 'mobile:rate-limit';
export const RateLimit = (opts: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, opts);

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly limiter: AuthRateLimiter,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const opts = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!opts) return true;
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';

    let wait = this.limiter.consume(`${opts.scope}|ip|${ip}`, opts.ipMax);
    const email = (req.body as { email?: unknown } | undefined)?.email;
    if (!wait && opts.emailMax && typeof email === 'string' && email) {
      wait = this.limiter.consume(
        `${opts.scope}|ipemail|${ip}|${email.trim().toLowerCase().slice(0, 254)}`,
        opts.emailMax,
      );
    }
    if (wait) {
      res.setHeader('Retry-After', String(wait));
      throw new HttpException(
        'Too many attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
