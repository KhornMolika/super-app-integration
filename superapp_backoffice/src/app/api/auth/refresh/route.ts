import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refresh_token=${refreshToken}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success || !data?.access_token) {
      const errorResponse = NextResponse.json({ error: 'Session expired' }, { status: 401 });
      errorResponse.cookies.delete('auth_token');
      errorResponse.cookies.delete('refresh_token');
      return errorResponse;
    }

    const isProd = process.env.NODE_ENV === 'production';
    const { access_token, refresh_token, ...userPayload } = data;
    const response = NextResponse.json(userPayload);

    response.cookies.set('auth_token', data.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: (data.expires_in || 15 * 60),
    });

    // Sliding rotation: update refresh_token cookie if new token or TTL returned
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
  } catch {
    return NextResponse.json({ error: 'Refresh failed' }, { status: 503 });
  }
}
