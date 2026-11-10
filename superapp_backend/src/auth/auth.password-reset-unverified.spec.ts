import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

/**
 * An account whose email was never verified can reset its password: the
 * recovery code goes to the same mailbox, so a correct code also verifies it.
 */
const EMAIL = 'dev@bank.com.kh';

function build(user: Record<string, unknown>) {
  const otp = {
    id: 'otp-1',
    email: EMAIL,
    code: '123456',
    purpose: 'PASSWORD_RESET',
    isUsed: false,
    attempts: 0,
    expiresAt: new Date(Date.now() + 60_000),
  };
  const updateQb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
  };
  const selectQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(otp),
  };
  const otpRepo = {
    createQueryBuilder: jest.fn((alias?: string) => (alias ? selectQb : updateQb)),
    create: jest.fn((v: Record<string, unknown>) => ({ id: 'otp-1', ...v })),
    save: jest.fn(async (v: unknown) => v),
    update: jest.fn().mockResolvedValue({}),
  };
  const accessControl = {
    findByEmailWithPermissions: jest.fn().mockResolvedValue(user),
    updateUserStatus: jest.fn().mockResolvedValue(undefined),
    updatePasswordDirectly: jest.fn().mockResolvedValue(undefined),
  };
  const mail = {
    sendPasswordResetOtp: jest.fn().mockResolvedValue({ status: 'sent', id: 'm1' }),
    sendBackofficeEmailVerification: jest.fn(),
  };
  const svc = new AuthService(
    new JwtService({}),
    accessControl as any,
    undefined,
    otpRepo as any,
    mail as any,
  );
  // Signing/verifying reset tokens needs the RSA keys; not under test here.
  jest.spyOn(svc as any, 'verifyToken').mockReturnValue({ email: EMAIL, typ: 'password_reset_token' });
  jest.spyOn((svc as any).jwtService, 'sign').mockReturnValue('reset-token');
  return { svc, accessControl, mail };
}

const unverifiedDev = { id: 'u1', status: 'PENDING_EMAIL_VERIFICATION', role: { name: 'MA_DEVELOPER' } };

describe('Password reset for an unverified email', () => {
  it('requestOtp sends the recovery code instead of refusing', async () => {
    const { svc, mail } = build({ ...unverifiedDev });
    const r = await svc.requestOtp({ email: EMAIL, purpose: 'PASSWORD_RESET' });
    expect(r.success).toBe(true);
    expect(r.emailDispatched).toBe(true);
    expect(mail.sendPasswordResetOtp).toHaveBeenCalled();
  });

  it('a correct recovery code verifies the email (developer -> PENDING_APPROVAL) and issues the reset token', async () => {
    const { svc, accessControl } = build({ ...unverifiedDev });
    const r = await svc.verifyOtp({ email: EMAIL, code: '123456', purpose: 'PASSWORD_RESET' } as any);
    expect(accessControl.updateUserStatus).toHaveBeenCalledWith('u1', 'PENDING_APPROVAL');
    expect(r).toMatchObject({ success: true, resetToken: 'reset-token' });
  });

  it('an unverified admin becomes ACTIVE', async () => {
    const { svc, accessControl } = build({ id: 'u2', status: 'PENDING_EMAIL_VERIFICATION', role: { name: 'ADMIN' } });
    await svc.verifyOtp({ email: EMAIL, code: '123456', purpose: 'PASSWORD_RESET' } as any);
    expect(accessControl.updateUserStatus).toHaveBeenCalledWith('u2', 'ACTIVE');
  });

  it('resetPassword succeeds and says the account awaits approval', async () => {
    const { svc, accessControl } = build({ id: 'u1', status: 'PENDING_APPROVAL', role: { name: 'MA_DEVELOPER' } });
    const r = await svc.resetPassword({ resetToken: 'reset-token', newPassword: 'New-Strong-Pass-1!' } as any);
    expect(accessControl.updatePasswordDirectly).toHaveBeenCalled();
    expect(r).toMatchObject({ success: true, nextStatus: 'PENDING_APPROVAL' });
  });

  it('an already active account is unchanged and gets nextStatus ACTIVE', async () => {
    const { svc, accessControl } = build({ id: 'u3', status: 'ACTIVE', role: { name: 'MA_DEVELOPER' } });
    await svc.verifyOtp({ email: EMAIL, code: '123456', purpose: 'PASSWORD_RESET' } as any);
    expect(accessControl.updateUserStatus).not.toHaveBeenCalled();
    const r = await svc.resetPassword({ resetToken: 'reset-token', newPassword: 'New-Strong-Pass-1!' } as any);
    expect(r).toMatchObject({ success: true, nextStatus: 'ACTIVE' });
  });
});
