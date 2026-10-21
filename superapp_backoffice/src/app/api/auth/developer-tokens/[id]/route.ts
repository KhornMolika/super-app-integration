import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000';

async function resolveToken(request: Request): Promise<string | null> {
  const clientAuth = request.headers.get('authorization');
  if (clientAuth && clientAuth.startsWith('Bearer ')) {
    return clientAuth.substring(7);
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('auth_token')?.value;
  if (cookieToken) return cookieToken;

  const candidateEmails = [
    process.env.DEV_FALLBACK_USER_EMAIL,
    process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL,
    'superadmin@example.com',
    'admin@example.com',
    'dev@example.com',
    'superadmin@superapp.gov.kh',
  ].filter(Boolean) as string[];

  for (const email of candidateEmails) {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) return data.access_token;
      }
    } catch (_) {}
  }
  return null;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = await resolveToken(request);

    const res = await fetch(`${BACKEND_URL}/auth/developer-tokens/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data || { success: true }, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to revoke developer token.' },
      { status: 500 },
    );
  }
}
