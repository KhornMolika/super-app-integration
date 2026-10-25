import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';


// Allowlist of base routes allowed through the proxy
const ALLOWED_ROUTES = [
  'mini-apps',
  'miniapps',
  'sdk-artifacts',
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
  'mobile',
  'health',
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
    const refreshToken = cookieStore.get('refresh_token')?.value;
    const clientAuth = request.headers.get('authorization');
    let newRefreshedToken: string | null = null;
    let newRefreshToken: string | null = null;

    // Check if current cookie token is expired
    let isStale = false;
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp - 10) {
            isStale = true;
          }
        } else {
          isStale = true;
        }
      } catch {
        isStale = true;
      }
    }

    // If token is stale and refresh token exists, attempt silent refresh with backend first
    if (isStale && refreshToken && !clientAuth) {
      try {
        const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `refresh_token=${refreshToken}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData?.access_token) {
            token = refreshData.access_token;
            newRefreshedToken = refreshData.access_token;
            if (refreshData?.refresh_token) {
              newRefreshToken = refreshData.refresh_token;
            }
            isStale = false;
          }
        }
      } catch (_) {}
    }

    // For session identification (/users/me), immediately return 401 if unauthenticated
    if (path === 'users/me' && !token && !clientAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Forward the request to the backend with timeout
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/${path}${searchParams}`, {
        method: request.method,
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });
    } catch (fetchErr: any) {
      return NextResponse.json(
        {
          statusCode: 503,
          code: 'BACKEND_SERVICE_DOWN',
          message: `Backend service is currently unreachable (${fetchErr.message || 'Connection Refused'}). It may be starting up or restarting.`,
        },
        { status: 503 },
      );
    }

    // If unauthorized and refreshToken exists, attempt a silent token refresh and retry once
    if (res.status === 401 && !clientAuth && refreshToken && !newRefreshedToken) {
      try {
        const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `refresh_token=${refreshToken}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData?.access_token) {
            newRefreshedToken = refreshData.access_token;
            if (refreshData?.refresh_token) {
              newRefreshToken = refreshData.refresh_token;
            }
            headers.set('Authorization', `Bearer ${refreshData.access_token}`);
            try {
              res = await fetch(`${BACKEND_URL}/${path}${searchParams}`, {
                method: request.method,
                headers,
                body,
                signal: AbortSignal.timeout(10000),
              });
            } catch (_) {}
          }
        }
      } catch (_) {}
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
        if (newRefreshToken) {
          response.cookies.set('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60,
          });
        }
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
