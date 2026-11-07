import { NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      const message =
        data?.message || data?.error || 'Failed to dispatch recovery code.';
      return NextResponse.json(
        {
          error: message,
          message,
          code: data?.code,
          requiresVerification:
            data?.code === 'EMAIL_NOT_VERIFIED' ||
            (typeof message === 'string' &&
              message.toLowerCase().includes('not been verified')),
        },
        { status: res.status || 400 },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Authentication service unreachable.' },
      { status: 503 },
    );
  }
}
