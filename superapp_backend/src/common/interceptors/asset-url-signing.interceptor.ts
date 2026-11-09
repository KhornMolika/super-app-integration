import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  isAssetProxyLink,
  minioOriginsFromEnv,
  rewriteRawMinioUrl,
  signAssetLink,
} from '../../storage/asset-url-signer';

/**
 * Signs every image link in a response body, at any depth. Stored values (logo
 * and avatar URLs in the DB) and every link builder stay unsigned; signing
 * happens once, here, on the way out. Raw MinIO URLs are rewritten to signed
 * proxy links, because MinIO itself is private.
 */
export function signAssetLinks(
  value: unknown,
  minioOrigins: string[],
  nowMs = Date.now(),
  seen = new WeakMap<object, unknown>(),
): unknown {
  if (typeof value === 'string') {
    if (isAssetProxyLink(value)) return signAssetLink(value, nowMs);
    if (minioOrigins.length) return rewriteRawMinioUrl(value, minioOrigins, nowMs);
    return value;
  }
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
    for (const item of value) out.push(signAssetLinks(item, minioOrigins, nowMs, seen));
    return out;
  }

  const out: Record<string, unknown> = {};
  seen.set(value, out);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    out[key] = signAssetLinks(child, minioOrigins, nowMs, seen);
  }
  return out;
}

@Injectable()
export class AssetUrlSigningInterceptor implements NestInterceptor {
  private readonly minioOrigins = minioOriginsFromEnv();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    return next
      .handle()
      .pipe(map((body) => signAssetLinks(body, this.minioOrigins)));
  }
}
