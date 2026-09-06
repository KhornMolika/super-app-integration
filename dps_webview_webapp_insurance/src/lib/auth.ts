import * as jose from 'jose';

export interface VerifiedUser {
  userName: string;
  initial: string;
  isAuthenticated: boolean;
  claims?: Record<string, unknown>;
}

/**
 * Verify a DPS Single Sign-On (SSO) JWT token using remote or local JWKS.
 * Falls back gracefully to Guest state if token is missing or invalid.
 */
export async function verifySsoToken(token?: string | null): Promise<VerifiedUser> {
  if (!token) {
    return {
      userName: 'Guest',
      initial: 'G',
      isAuthenticated: false,
    };
  }

  try {
    const jwksUrl = process.env.DPS_AUTH_JWKS_URL || 'http://localhost:3000/auth/jwks';
    const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jose.jwtVerify(token, JWKS);
    
    const userName = (payload.name as string) || (payload.sub as string) || 'DPS User';
    const initial = userName.charAt(0).toUpperCase();

    return {
      userName,
      initial,
      isAuthenticated: true,
      claims: payload as Record<string, unknown>,
    };
  } catch (error) {
    console.error('DPS SSO JWT validation failed:', error);
    return {
      userName: 'Guest (Auth Error)',
      initial: '!',
      isAuthenticated: false,
    };
  }
}
