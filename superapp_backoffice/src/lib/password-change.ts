import type { NextResponse } from 'next/server';

/**
 * Set while the signed-in user must replace a password someone else chose
 * (seed account, created or reset by an admin). proxy.ts keeps every page on
 * /change-password until it is gone; the backend refuses other calls anyway.
 */
export const PASSWORD_CHANGE_COOKIE = 'pwd_change';
export const CHANGE_PASSWORD_PATH = '/change-password';

export function syncPasswordChangeCookie(response: NextResponse, required: boolean): void {
  if (required) {
    response.cookies.set(PASSWORD_CHANGE_COOKIE, '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
  } else {
    response.cookies.delete(PASSWORD_CHANGE_COOKIE);
  }
}
