import { NextResponse } from 'next/server';

/**
 * Verifies that same-origin mutating BFF requests come from the same host
 * when an Origin header is supplied by the browser.
 */
export function verifySameOrigin(request: Request): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  const origin = request.headers.get('origin');
  if (!origin) return null;

  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) return null;

  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json(
        { error: 'Cross-origin request rejected' },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json({ error: 'Invalid Origin header' }, { status: 403 });
  }

  return null;
}
