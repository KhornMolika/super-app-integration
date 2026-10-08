import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success || !data?.access_token) {
      const message = data?.message || 'Registration failed. Please check your inputs.';
      return NextResponse.json({ error: message }, { status: res.status === 200 ? 400 : res.status });
    }

    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === 'production';

    cookieStore.set('auth_token', data.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: (data.expires_in || 15 * 60),
    });

    if (data.refresh_token) {
      cookieStore.set('refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: (data.refresh_expires_in || 7 * 24 * 60 * 60),
      });
    }

    const { access_token, refresh_token, ...userPayload } = data;
    return NextResponse.json(userPayload);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Registration service is currently unreachable. Please try again.' },
      { status: 503 },
    );
  }
}
