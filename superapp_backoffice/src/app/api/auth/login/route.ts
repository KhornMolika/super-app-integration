import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Forward the login request to the NestJS backend
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errorMessage = 'Authentication failed';
      try {
        const errJson = await res.json();
        if (errJson?.message) {
          errorMessage = Array.isArray(errJson.message) ? errJson.message.join(', ') : errJson.message;
        }
      } catch (_) {}
      return NextResponse.json({ error: errorMessage }, { status: res.status });
    }

    const data = await res.json();
    
    if (!data.access_token) {
      return NextResponse.json({ error: 'Invalid response from authentication server' }, { status: 500 });
    }

    // Await the cookies() promise in Next.js 15
    const cookieStore = await cookies();
    
    const envVal = (
      process.env.NEXT_PUBLIC_ENVIRONMENT ||
      process.env.ENVIRONMENT ||
      process.env.NODE_ENV ||
      ''
    ).toUpperCase();
    const isProd = envVal === 'PROD';

    // Set the token in an HttpOnly cookie
    cookieStore.set('auth_token', data.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax', 
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    // Return the user object WITHOUT the token
    const { access_token, ...userPayload } = data;
    return NextResponse.json(userPayload);
    
  } catch (error: any) {
    console.error('Login proxy error:', error);
    const isConnRefused =
      error?.code === 'ECONNREFUSED' ||
      error?.cause?.code === 'ECONNREFUSED' ||
      error?.message?.includes('fetch failed');
    const status = isConnRefused ? 503 : 500;
    const message = isConnRefused
      ? 'Backend service is currently unreachable. It may be starting up or restarting. Please try again shortly.'
      : 'Authentication server error occurred. Please try again.';

    return NextResponse.json({ error: message }, { status });
  }
}
