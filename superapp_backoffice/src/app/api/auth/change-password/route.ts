import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncPasswordChangeCookie } from '@/lib/password-change';

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      const message = data?.message || data?.error || 'Failed to update password';
      return NextResponse.json({ error: message }, { status: res.status || 400 });
    }

    // The backend ended the other sessions and issued new tokens for this one
    const isProd = process.env.NODE_ENV === 'production';
    const { access_token, refresh_token, ...result } = data;
    const response = NextResponse.json(result);
    if (access_token) {
      response.cookies.set('auth_token', access_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: data.expires_in || 15 * 60,
      });
    }
    if (refresh_token) {
      response.cookies.set('refresh_token', refresh_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: data.refresh_expires_in || 7 * 24 * 60 * 60,
      });
    }
    syncPasswordChangeCookie(response, data.must_change_password === true);
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Password update service unreachable' },
      { status: 500 },
    );
  }
}
