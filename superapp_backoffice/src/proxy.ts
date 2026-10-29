import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/verify-otp',
  '/forgot-password',
  '/legal',
];

/**
 * Next.js 16+ Edge Proxy Network Gateway (migrated from legacy middleware.ts)
 * Intercepts requests before route execution for route protection, authentication state,
 * and seamless session renewal.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Skip API proxy endpoints, Next.js internal static assets, and files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const authToken = request.cookies.get('auth_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const hasTokens = Boolean(authToken || refreshToken);

  // 2. Protect routes: If accessing a protected route without any session cookies
  if (!isPublicRoute && !hasTokens) {
    const loginUrl = new URL('/login', request.url);
    if (pathname && pathname !== '/') {
      loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 3. Guest routes: If user is authenticated and visits /login or /signup, send to dashboard
  if (isPublicRoute && hasTokens && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/miniapps', request.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, manifest files
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

