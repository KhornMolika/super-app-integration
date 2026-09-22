import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

let cachedDevToken: { token: string; expiresAt: number } | null = null;

async function getDevAuthToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cachedDevToken && Date.now() < cachedDevToken.expiresAt) {
    return cachedDevToken.token;
  }
  const fallbackEmail = process.env.DEV_FALLBACK_USER_EMAIL;
  if (!fallbackEmail) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fallbackEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        cachedDevToken = {
          token: data.access_token,
          expiresAt: Date.now() + 1000 * 60 * 30, // 30 mins
        };
        return data.access_token;
      }
    }
  } catch (err) {
    console.error('Failed to get fallback dev auth token in proxy:', err);
  }
  return null;
}

// Allowlist of base routes allowed through the proxy
const ALLOWED_ROUTES = [
  'mini-apps',
  'miniapps',
  'permissions',
  'permission-proposals',
  'users',
  'roles',
  'organizations',
  'super-app',
  'audit-logs',
  'integrations',
  'release-assembly',
  'security',
  'storage',
  'telegram',
  'mail',
  'settings',
  'notifications',
  'auth',
  'api',
  'pubspec',
];

async function handleProxy(request: Request, { params }: { params: Promise<{ proxy: string[] }> }) {
  try {
    const proxyParams = await params;
    const pathParts = proxyParams.proxy || [];
    
    // Check allowlist
    const baseRoute = pathParts[0];
    if (!ALLOWED_ROUTES.includes(baseRoute)) {
      return NextResponse.json({ error: 'Forbidden route' }, { status: 403 });
    }

    const path = pathParts.join('/');
    const url = new URL(request.url);
    const searchParams = url.search;
    
    // Get the auth token
    const cookieStore = await cookies();
    let token = cookieStore.get('auth_token')?.value;
    const clientAuth = request.headers.get('authorization');

    // If no token or clientAuth header, fallback to dev token so cold links from Telegram always succeed
    if (!token && !clientAuth) {
      const devToken = await getDevAuthToken();
      if (devToken) {
        token = devToken;
      }
    }

    // Prepare headers
    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else if (clientAuth) {
      headers.set('Authorization', clientAuth);
    } else if (process.env.BACKEND_INTERNAL_SECRET) {
      headers.set('Authorization', `Bearer ${process.env.BACKEND_INTERNAL_SECRET}`);
    }
    
    // Forward Content-Type if present
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    // Prepare body if applicable
    let body: BodyInit | undefined = undefined;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      try {
        const arrayBuffer = await request.arrayBuffer();
        if (arrayBuffer && arrayBuffer.byteLength > 0) {
          body = Buffer.from(arrayBuffer);
        }
      } catch (_) {
        // Body might be empty or already consumed
      }
    }

    // Forward the request to the backend
    let res = await fetch(`${BACKEND_URL}/${path}${searchParams}`, {
      method: request.method,
      headers,
      body,
    });

    // If unauthorized (stale cookie, token expired, or backend restarted with new RSA keys),
    // automatically attempt a refresh with dev fallback and retry once
    let newRefreshedToken: string | null = null;
    if (res.status === 401 && !clientAuth) {
      const devToken = await getDevAuthToken(true);
      if (devToken) {
        newRefreshedToken = devToken;
        headers.set('Authorization', `Bearer ${devToken}`);
        res = await fetch(`${BACKEND_URL}/${path}${searchParams}`, {
          method: request.method,
          headers,
          body,
        });
      }
    }

    const applyAuthCookie = (response: NextResponse) => {
      if (newRefreshedToken) {
        const envVal = (
          process.env.NEXT_PUBLIC_ENVIRONMENT ||
          process.env.ENVIRONMENT ||
          process.env.NODE_ENV ||
          ''
        ).toUpperCase();
        const isProd = envVal === 'PROD';
        response.cookies.set('auth_token', newRefreshedToken, {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24,
        });
      }
      return response;
    };

    // If the response has no content
    if (res.status === 204) {
      return applyAuthCookie(new NextResponse(null, { status: 204 }));
    }

    const contentTypeHeader = res.headers.get('content-type');

    // If the response is binary (APK, octet-stream, zip, or attachment)
    const isBinary =
      contentTypeHeader &&
      (contentTypeHeader.includes('application/vnd.android.package-archive') ||
        contentTypeHeader.includes('application/octet-stream') ||
        contentTypeHeader.includes('application/zip') ||
        contentTypeHeader.includes('application/gzip') ||
        contentTypeHeader.includes('image/'));

    const contentDisposition = res.headers.get('content-disposition');

    if (isBinary || contentDisposition) {
      const respHeaders = new Headers();
      if (contentTypeHeader) respHeaders.set('Content-Type', contentTypeHeader);
      if (contentDisposition) respHeaders.set('Content-Disposition', contentDisposition);
      const contentLength = res.headers.get('content-length');
      if (contentLength) respHeaders.set('Content-Length', contentLength);

      return applyAuthCookie(new NextResponse(res.body, {
        status: res.status,
        headers: respHeaders,
      }));
    }

    // Try to get response as JSON, fallback to text
    if (contentTypeHeader && contentTypeHeader.includes('application/json')) {
      const data = await res.json();
      return applyAuthCookie(NextResponse.json(data, { status: res.status }));
    } else {
      const text = await res.text();
      return applyAuthCookie(new NextResponse(text, { status: res.status }));
    }

    
  } catch (error: any) {
    console.error('BFF Proxy Error:', error);
    const isConnRefused =
      error?.code === 'ECONNREFUSED' ||
      error?.cause?.code === 'ECONNREFUSED' ||
      error?.message?.includes('fetch failed');
    const status = isConnRefused ? 503 : 502;
    const message = isConnRefused
      ? 'Backend service is currently unreachable. It may be starting up or restarting. Please try again shortly.'
      : (error?.message || 'Upstream gateway error encountered while communicating with backend.');

    return NextResponse.json(
      {
        statusCode: status,
        error: isConnRefused ? 'Service Unavailable' : 'Bad Gateway',
        message,
        code: isConnRefused ? 'BACKEND_SERVICE_DOWN' : 'GATEWAY_ERROR',
        timestamp: new Date().toISOString(),
      },
      { status },
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
