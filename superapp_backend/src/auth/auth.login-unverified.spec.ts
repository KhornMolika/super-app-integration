import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { hashPassword } from '../common/utils/password.util';

const EMAIL = 'dev@bank.com.kh';
const PASSWORD = 'Correct-horse-9!';

async function loginService(status: string) {
  const passwordHash = await hashPassword(PASSWORD);
  const accessControl = {
    findByEmailWithPermissions: jest.fn().mockResolvedValue({
      id: 'u1',
      email: EMAIL,
      status,
      roles: ['MA_DEVELOPER'],
    }),
    getPasswordHash: jest.fn().mockResolvedValue(passwordHash),
  };
  return new AuthService(new JwtService({}), accessControl as any);
}

describe('AuthService.login for an unverified email', () => {
  it('correct password: 401 with code EMAIL_NOT_VERIFIED, so the UI can offer verification', async () => {
    const svc = await loginService('PENDING_EMAIL_VERIFICATION');
    const err = await svc
      .login({ email: EMAIL, password: PASSWORD } as any)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect((err as UnauthorizedException).getResponse()).toMatchObject({
      code: 'EMAIL_NOT_VERIFIED',
    });
  });

  it('wrong password: the generic failure, never revealing the account state', async () => {
    const svc = await loginService('PENDING_EMAIL_VERIFICATION');
    const r = await svc.login({ email: EMAIL, password: 'wrong-password' } as any);
    expect(r).toMatchObject({ success: false, message: 'Invalid email or password' });
    expect(JSON.stringify(r)).not.toContain('EMAIL_NOT_VERIFIED');
  });
});

describe('AuthService.verifyOtp EMAIL_VERIFICATION nextStatus', () => {
  function verifyService(user: Record<string, unknown>) {
    const otp = {
      id: 'otp-1',
      email: EMAIL,
      code: '123456',
      purpose: 'EMAIL_VERIFICATION',
      isUsed: false,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    };
    const qb = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(otp),
    };
    const otpRepo = {
      createQueryBuilder: jest.fn(() => qb),
      save: jest.fn(async (v: unknown) => v),
    };
    const accessControl = {
      findByEmailWithPermissions: jest.fn().mockResolvedValue(user),
      updateUserStatus: jest.fn().mockResolvedValue(undefined),
    };
    const svc = new AuthService(
      new JwtService({}),
      accessControl as any,
      undefined,
      otpRepo as any,
    );
    return { svc, accessControl };
  }

  it('a developer moves to PENDING_APPROVAL and the response says so', async () => {
    const { svc, accessControl } = verifyService({
      id: 'u1',
      status: 'PENDING_EMAIL_VERIFICATION',
      role: { name: 'MA_DEVELOPER' },
    });
    const r = await svc.verifyOtp({
      email: EMAIL,
      code: '123456',
      purpose: 'EMAIL_VERIFICATION',
    } as any);
    expect(accessControl.updateUserStatus).toHaveBeenCalledWith('u1', 'PENDING_APPROVAL');
    expect(r).toMatchObject({ success: true, nextStatus: 'PENDING_APPROVAL' });
  });

  it('an admin becomes ACTIVE and can sign in right away', async () => {
    const { svc } = verifyService({
      id: 'u2',
      status: 'PENDING_EMAIL_VERIFICATION',
      role: { name: 'ADMIN' },
    });
    const r = await svc.verifyOtp({
      email: EMAIL,
      code: '123456',
      purpose: 'EMAIL_VERIFICATION',
    } as any);
    expect(r).toMatchObject({ success: true, nextStatus: 'ACTIVE' });
  });
});
