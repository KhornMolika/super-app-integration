import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Keys that must never appear in an HTTP response, at any depth.
 * The primary protection is `select: false` on these columns plus explicit
 * response shapes; this interceptor is the safety net for anything that slips
 * through (e.g. an entity spread into a response, an eager relation).
 */
export const SENSITIVE_RESPONSE_KEYS = new Set([
  'passwordHash',
  'tokenHash',
  'refreshTokenHash',
  'codeHash',
]);

/** Removes SENSITIVE_RESPONSE_KEYS from a value, returning a copy only where needed. */
export function stripSensitiveFields(
  value: unknown,
  onStrip?: (path: string) => void,
  path = '$',
  seen = new WeakMap<object, unknown>(),
): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (
    value instanceof Date ||
    value instanceof StreamableFile ||
    Buffer.isBuffer(value) ||
    ArrayBuffer.isView(value) ||
    typeof (value as any).pipe === 'function' // streams
  ) {
    return value;
  }
  if (seen.has(value)) return seen.get(value);

  if (Array.isArray(value)) {
    const out: unknown[] = [];
    seen.set(value, out);
    value.forEach((item, i) => out.push(stripSensitiveFields(item, onStrip, `${path}[${i}]`, seen)));
    return out;
  }

  const out: Record<string, unknown> = {};
  seen.set(value, out);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_RESPONSE_KEYS.has(key)) {
      // Entity instances carry every declared field (ES2022+ class fields), so an
      // unloaded select:false column shows up as `key: undefined`. That is not a
      // leak; only report keys that actually hold a value.
      if (child !== undefined && child !== null) onStrip?.(`${path}.${key}`);
      continue;
    }
    out[key] = stripSensitiveFields(child, onStrip, `${path}.${key}`, seen);
  }
  return out;
}

@Injectable()
export class SensitiveFieldsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SensitiveFieldsInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const route = `${req?.method} ${req?.route?.path ?? req?.url}`;

    return next.handle().pipe(
      map((body) =>
        stripSensitiveFields(body, (path) =>
          // A strip means some code path loaded a secret into a response:
          // the response is safe, but the code should be fixed.
          this.logger.warn(`Stripped sensitive field ${path} from response of ${route}`),
        ),
      ),
    );
  }
}
