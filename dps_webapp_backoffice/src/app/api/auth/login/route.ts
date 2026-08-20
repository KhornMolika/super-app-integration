import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
      return NextResponse.json({ error: 'Authentication failed' }, { status: res.status });
    }

    const data = await res.json();
    
    if (!data.access_token) {
      return NextResponse.json({ error: 'Invalid response from server' }, { status: 500 });
    }

    // Await the cookies() promise in Next.js 15
    const cookieStore = await cookies();
    
    // Set the token in an HttpOnly cookie
    cookieStore.set('auth_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', 
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    // Return the user object WITHOUT the token
    const { access_token, ...userPayload } = data;
    return NextResponse.json(userPayload);
    
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
