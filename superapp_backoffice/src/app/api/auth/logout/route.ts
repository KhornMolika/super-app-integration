import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncPasswordChangeCookie } from '@/lib/password-change';

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000';

export async function POST() {
  // End the session on the server too: its refresh token stops working
  const refreshToken = (await cookies()).get('refresh_token')?.value;
  if (refreshToken) {
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete('auth_token');
  response.cookies.delete('refresh_token');
  syncPasswordChangeCookie(response, false);
  return response;
}
