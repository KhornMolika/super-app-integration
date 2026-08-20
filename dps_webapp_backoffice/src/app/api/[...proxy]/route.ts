import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
  'audit-logs'
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
    const token = cookieStore.get('auth_token')?.value;

    // Prepare headers
    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Forward Content-Type if present
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    // Prepare body if applicable
    let body = undefined;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && request.body) {
      // In Next.js App Router, request.body is a ReadableStream which can be passed directly to fetch
      body = request.body;
    }

    // Forward the request to the backend
    const res = await fetch(`${BACKEND_URL}/${path}${searchParams}`, {
      method: request.method,
      headers,
      body,
      // Need this for streams
      duplex: 'half',
    } as RequestInit);

    // If the response has no content
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    // Try to get response as JSON, fallback to text
    const contentTypeHeader = res.headers.get('content-type');
    if (contentTypeHeader && contentTypeHeader.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      const text = await res.text();
      return new NextResponse(text, { status: res.status });
    }
    
  } catch (error) {
    console.error('BFF Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Gateway Error' }, { status: 502 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
