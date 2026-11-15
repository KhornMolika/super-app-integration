import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

/** Roles written into the back-office access token for a user. */
async function tokenRoles(user: Record<string, unknown>): Promise<string[]> {
  const jwt = new JwtService({});
  const sign = jest.spyOn(jwt, 'sign').mockReturnValue('signed');
  const svc = new AuthService(jwt, {} as any);
  await (svc as any).generateAuthTokens({
    id: 'u1',
    email: 'x@fsa.gov.kh',
    ...user,
  });
  return (sign.mock.calls[0][0] as { roles: string[] }).roles;
}

describe('access token roles', () => {
  it('keeps STAFF as STAFF (no developer rights)', async () => {
    expect(
      await tokenRoles({ roles: [{ name: 'STAFF', permissions: [] }] }),
    ).toEqual(['STAFF']);
  });

  it('a user with no known role gets no role, not MA_DEVELOPER', async () => {
    expect(await tokenRoles({ roles: [] })).toEqual([]);
    expect(
      await tokenRoles({
        roles: [{ name: 'SOMETHING_ELSE', permissions: [] }],
      }),
    ).toEqual([]);
  });

  it('keeps the platform roles and the developer aliases', async () => {
    expect(
      await tokenRoles({
        roles: [{ name: 'SUPER_ADMIN' }],
        organization: { code: 'FTC' },
      }),
    ).toEqual(['SUPER_ADMIN']);
    expect(await tokenRoles({ roles: [{ name: 'ADMIN' }] })).toEqual(['ADMIN']);
    expect(
      await tokenRoles({ roles: [{ name: 'MINI_APP_DEVELOPER' }] }),
    ).toEqual(['MA_DEVELOPER']);
  });

  it('never issues a Super Admin token outside the platform owner organization', async () => {
    await expect(
      tokenRoles({
        roles: [{ name: 'SUPER_ADMIN' }],
        organization: { code: 'IRC' },
      }),
    ).rejects.toThrow(/platform owner organization/);
  });
});
