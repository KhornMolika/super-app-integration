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
      cookieStore.delete('auth_token');
      cookieStore.delete('refresh_token');
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const isProd = process.env.NODE_ENV === 'production';
    cookieStore.set('auth_token', data.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: (data.expires_in || 15 * 60),
    });

    const { access_token, refresh_token, ...userPayload } = data;
    return NextResponse.json(userPayload);
  } catch {
    return NextResponse.json({ error: 'Refresh failed' }, { status: 503 });
  }
}
