import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

/** Roles written into the back-office access token for a user. */
function tokenRoles(user: Record<string, unknown>): string[] {
  const jwt = new JwtService({});
  const sign = jest.spyOn(jwt, 'sign').mockReturnValue('signed');
  const svc = new AuthService(jwt, {} as any);
  (svc as any).generateAuthTokens({ id: 'u1', email: 'x@fsa.gov.kh', ...user });
  return (sign.mock.calls[0][0] as { roles: string[] }).roles;
}

describe('access token roles', () => {
  it('keeps STAFF as STAFF (no developer rights)', () => {
    expect(tokenRoles({ roles: [{ name: 'STAFF', permissions: [] }] })).toEqual(['STAFF']);
  });

  it('a user with no known role gets no role, not MA_DEVELOPER', () => {
    expect(tokenRoles({ roles: [] })).toEqual([]);
    expect(tokenRoles({ roles: [{ name: 'SOMETHING_ELSE', permissions: [] }] })).toEqual([]);
  });

  it('keeps the platform roles and the developer aliases', () => {
    expect(tokenRoles({ roles: [{ name: 'SUPER_ADMIN' }] })).toEqual(['SUPER_ADMIN']);
    expect(tokenRoles({ roles: [{ name: 'ADMIN' }] })).toEqual(['ADMIN']);
    expect(tokenRoles({ roles: [{ name: 'MINI_APP_DEVELOPER' }] })).toEqual(['MA_DEVELOPER']);
  });
});
