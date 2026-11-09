import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signed image links for the backend asset proxy (/storage/asset).
 *
 * MinIO is private and only reachable by the backend. The proxy serves an
 * object only when the link carries a valid `exp` + `sig` that the backend
 * issued, so keys cannot be guessed or enumerated, while <img> tags and the
 * mobile app still load images without sending a token.
 */

const DAY_SECONDS = 24 * 60 * 60;
/** Links stay valid for 7 to 8 days (until next UTC midnight + 7 days). */
const VALIDITY_DAYS = 7;

let cachedSecret: Buffer | null = null;

function signingKey(): Buffer {
  if (cachedSecret) return cachedSecret;
  const raw =
    process.env.ASSET_URL_SECRET ||
    process.env.JWT_SECRET ||
    process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw && process.env.NODE_ENV === 'production') {
    throw new Error(
      'ASSET_URL_SECRET (or JWT_SECRET) must be configured in production to sign asset links',
    );
  }
  // Domain-separated, so the key differs from every other use of JWT_SECRET.
  cachedSecret = createHmac('sha256', raw || 'superapp-dev-asset-url-key')
    .update('asset-url-signing-v1')
    .digest();
  return cachedSecret;
}

/** Test hook: forget the derived key after changing env vars. */
export function resetAssetSigningKeyForTests(): void {
  cachedSecret = null;
}

/**
 * Expiry (unix seconds): next UTC midnight + 7 days. Every link issued on the
 * same day is identical, so browser and Flutter image caches keep working.
 */
export function assetLinkExpiry(nowMs = Date.now()): number {
  const nowSec = Math.floor(nowMs / 1000);
  const nextMidnight = (Math.floor(nowSec / DAY_SECONDS) + 1) * DAY_SECONDS;
  return nextMidnight + VALIDITY_DAYS * DAY_SECONDS;
}

export function computeAssetSignature(
  key: string,
  bucket: string | undefined | null,
  exp: number,
): string {
  return createHmac('sha256', signingKey())
    .update(`${key}\n${bucket ?? ''}\n${exp}`)
    .digest('base64url');
}

/** True when `sig` was issued for exactly this key, bucket and unexpired exp. */
export function verifyAssetSignature(
  key: string | undefined,
  bucket: string | undefined,
  exp: string | undefined,
  sig: string | undefined,
  nowMs = Date.now(),
): boolean {
  if (!key || !exp || !sig || !/^\d{1,12}$/.test(exp)) return false;
  const expNum = Number(exp);
  if (expNum * 1000 < nowMs) return false;
  const expected = Buffer.from(computeAssetSignature(key, bucket, expNum));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const IMAGE_KEY_RE = /\.(?:png|jpe?g|webp|svg|gif|ico)$/i;

/** A whole string that is a backend asset-proxy link (absolute or relative). */
const ASSET_LINK_RE = /^(?:https?:\/\/[^\s/?#]+)?\/(?:api\/)?storage\/asset\?\S*$/;

export function isAssetProxyLink(value: string): boolean {
  return ASSET_LINK_RE.test(value);
}

/**
 * Sets a fresh `exp` and `sig` on an asset-proxy link. A link that already has
 * them is re-signed too: a client may save a signed link back into the DB, and
 * it must not expire there. Links without a `key` come back unchanged.
 */
export function signAssetLink(link: string, nowMs = Date.now()): string {
  if (!isAssetProxyLink(link)) return link;
  const absolute = /^https?:\/\//.test(link);
  let url: URL;
  try {
    url = new URL(link, 'http://placeholder.local');
  } catch {
    return link;
  }
  const key = url.searchParams.get('key');
  if (!key) return link;
  const bucket = url.searchParams.get('bucket') ?? '';
  const exp = assetLinkExpiry(nowMs);
  url.searchParams.set('exp', String(exp));
  url.searchParams.set('sig', computeAssetSignature(key, bucket, exp));
  return absolute ? url.toString() : `${url.pathname}${url.search}`;
}

/**
 * Turns a raw MinIO object URL (e.g. http://10.200.8.6:9000/superapp-storage/logos/a.png)
 * into a signed proxy link. `minioOrigins` are the origins MinIO is known by.
 * MinIO presigned URLs (X-Amz-Signature) are left alone: they are already signed.
 */
export function rewriteRawMinioUrl(
  value: string,
  minioOrigins: string[],
  nowMs = Date.now(),
): string {
  if (!/^https?:\/\//.test(value) || value.includes('X-Amz-Signature')) {
    return value;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  if (!minioOrigins.includes(url.origin)) return value;
  const key = decodeURIComponent(url.pathname.replace(/^\/+/, '')).replace(
    /^(?:superapp-storage|mini-app-assets|mini-app-logos)\//,
    '',
  );
  // Images only: other objects (package sources, reports) are not served by the
  // asset proxy, so their URLs are left as they are.
  if (!key || !IMAGE_KEY_RE.test(key)) return value;
  return signAssetLink(
    `/api/storage/asset?key=${encodeURIComponent(key)}`,
    nowMs,
  );
}

/** Origins MinIO is reachable at, from MINIO_PUBLIC_URL and MINIO_ENDPOINT/PORT. */
export function minioOriginsFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const origins = new Set<string>();
  const add = (u?: string) => {
    if (!u) return;
    try {
      origins.add(new URL(u).origin);
    } catch {
      /* ignore malformed */
    }
  };
  add(env.MINIO_PUBLIC_URL);
  if (env.MINIO_ENDPOINT) {
    const port = env.MINIO_PORT || '9000';
    const scheme = env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    add(`${scheme}://${env.MINIO_ENDPOINT}:${port}`);
  }
  return [...origins];
}
