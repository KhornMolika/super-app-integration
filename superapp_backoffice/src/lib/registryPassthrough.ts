/**
 * Partner package registries (Dart pub at /pub, npm at /api/sdk) live in the
 * backend. Production routes these paths to the Back Office, so it passes them
 * through unchanged: the partner's own developer token (never the Back Office
 * login cookie), the public host (the backend writes download URLs with it),
 * and the body streamed (package archives can be large).
 */
const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/** Response headers that must not be copied: fetch already decoded the body. */
const DROP_RESPONSE_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection']);

export async function passThroughToRegistry(
  request: Request,
  backendPath: string,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return Response.json({ error: 'Read-only registry' }, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  // Only plain path segments: no "..", no encoded slashes sneaking out of the registry
  if (backendPath.split('/').some((seg) => !seg || seg === '.' || seg === '..')) {
    return Response.json({ error: 'Bad path' }, { status: 400 });
  }

  const incoming = new URL(request.url);
  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  const accept = request.headers.get('accept');
  if (accept) headers.set('accept', accept);
  headers.set('x-forwarded-host', request.headers.get('x-forwarded-host') || request.headers.get('host') || incoming.host);
  for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
  headers.set('x-forwarded-proto', request.headers.get('x-forwarded-proto') || incoming.protocol.replace(':', ''));

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/${backendPath}${incoming.search}`, {
      method: request.method,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err: any) {
    return Response.json(
      { error: 'Package registry is unreachable', detail: err?.message || 'connection failed' },
      { status: 502 },
    );
  }

  const out = new Headers();
  res.headers.forEach((value, key) => {
    if (!DROP_RESPONSE_HEADERS.has(key.toLowerCase())) out.set(key, value);
  });
  return new Response(request.method === 'HEAD' ? null : res.body, { status: res.status, headers: out });
}
