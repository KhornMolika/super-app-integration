import * as jose from 'jose';
import InsuranceAppClient from './components/InsuranceAppClient';

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const token = params?.token;

  let userName = 'Guest';
  let initial = 'G';
  let isAuthenticated = false;

  if (token) {
    try {
      const JWKS = jose.createRemoteJWKSet(new URL('http://localhost:3000/auth/jwks'));
      const { payload } = await jose.jwtVerify(token, JWKS);
      userName = (payload.name as string) || 'User';
      initial = userName.charAt(0).toUpperCase();
      isAuthenticated = true;
    } catch (error) {
      console.error('JWT validation failed:', error);
      userName = 'Invalid Token';
      initial = '!';
    }
  }

  return (
    <InsuranceAppClient
      userName={userName}
      initial={initial}
      isAuthenticated={isAuthenticated}
    />
  );
}
