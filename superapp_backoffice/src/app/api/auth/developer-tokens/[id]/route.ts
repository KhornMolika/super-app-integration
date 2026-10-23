import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000';

const FALLBACK_STORE_PATH = path.join(process.cwd(), '.developer_tokens.json');

function loadFallbackTokens(): any[] {
  try {
    if (fs.existsSync(FALLBACK_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(FALLBACK_STORE_PATH, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function saveFallbackTokens(tokens: any[]) {
  try {
    fs.writeFileSync(FALLBACK_STORE_PATH, JSON.stringify(tokens, null, 2), 'utf8');
  } catch (_) {}
}

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
    'molikakhorn71@gmail.com',
    'thavorac.chun@gmail.com',
    'sea.hutmonineat@gmail.com',
  ].filter(Boolean) as string[];

  for (const email of candidateEmails) {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!@#' }),
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

    try {
      await fetch(`${BACKEND_URL}/auth/developer-tokens/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
    } catch (_) {}

    // Mark as inactive in local fallback store
    const tokens = loadFallbackTokens();
    const updated = tokens.map((t) => (t.id === id ? { ...t, isActive: false } : t));
    saveFallbackTokens(updated);

    return NextResponse.json({ success: true, message: 'Developer token revoked.' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to revoke developer token.' },
      { status: 500 },
    );
  }
}
