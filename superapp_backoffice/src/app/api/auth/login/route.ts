import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success || !data?.access_token) {
      const message = data?.message || data?.error || 'Invalid credentials or user not found.';
      return NextResponse.json(
        { error: message, pendingApproval: Boolean(data?.pendingApproval) },
        { status: res.status >= 400 ? res.status : 401 },
      );
    }

    const isProd = process.env.NODE_ENV === 'production';
    const { access_token, refresh_token, ...userPayload } = data;
    const response = NextResponse.json(userPayload);

    // 1. Short-lived Access Token (15 mins)
    response.cookies.set('auth_token', data.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: (data.expires_in || 15 * 60),
    });

    // 2. Long-lived Refresh Token (7 days)
    if (data.refresh_token) {
      response.cookies.set('refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: (data.refresh_expires_in || 7 * 24 * 60 * 60),
      });
    }

    return response;
  } catch (error: any) {
    console.error('[DEBUG /api/auth/login ERROR]', error);
    return NextResponse.json(
      { error: 'Authentication service is currently unreachable. Please try again.', details: error?.message },
      { status: 503 },
    );
  }
}
