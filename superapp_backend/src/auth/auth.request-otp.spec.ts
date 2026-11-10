import { ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

/** requestOtp must only claim "sent" when the email provider accepted it. */
function build(
  delivery: { status: 'sent' | 'skipped' | 'failed'; id?: string; reason?: string },
  user: Record<string, unknown> | null = {
    id: 'u1',
    name: 'Dev',
    status: 'PENDING_EMAIL_VERIFICATION',
  },
) {
  const qb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
  };
  const otpRepo = {
    createQueryBuilder: jest.fn(() => qb),
    create: jest.fn((v: Record<string, unknown>) => ({ id: 'otp-1', ...v })),
    save: jest.fn(async (v: unknown) => v),
    update: jest.fn().mockResolvedValue({}),
  };
  const mail = {
    sendBackofficeEmailVerification: jest.fn().mockResolvedValue(delivery),
    sendPasswordResetOtp: jest.fn().mockResolvedValue(delivery),
  };
  const accessControl = {
    findByEmailWithPermissions: jest.fn().mockResolvedValue(user),
  };
  const svc = new AuthService(
    new JwtService({}),
    accessControl as any,
    undefined,
    otpRepo as any,
    mail as any,
  );
  return { svc, otpRepo, mail };
}

describe('AuthService.requestOtp email delivery', () => {
  const OLD_ENV = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = OLD_ENV;
  });

  it('returns emailDispatched=true and a verification wording when the email was accepted', async () => {
    const { svc } = build({ status: 'sent', id: 'msg-1' });
    const r = await svc.requestOtp({ email: 'Dev@Bank.com.kh', purpose: 'EMAIL_VERIFICATION' });
    expect(r.emailDispatched).toBe(true);
    expect(r.message).toBe('A 6-digit verification code was sent to dev@bank.com.kh.');
    expect(r).not.toHaveProperty('emailError');
  });

  it('keeps the recovery wording for password reset', async () => {
    const { svc } = build({ status: 'sent', id: 'msg-2' }, { id: 'u1', name: 'Dev', status: 'ACTIVE' });
    const r = await svc.requestOtp({ email: 'dev@bank.com.kh', purpose: 'PASSWORD_RESET' });
    expect(r.message).toBe('A 6-digit recovery code was sent to dev@bank.com.kh.');
  });

  it('throws 503 and burns the code when sending failed (no false "dispatched")', async () => {
    const { svc, otpRepo } = build({ status: 'failed', reason: 'Unable to fetch data' });
    await expect(
      svc.requestOtp({ email: 'dev@bank.com.kh', purpose: 'EMAIL_VERIFICATION' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(otpRepo.update).toHaveBeenCalledWith({ id: 'otp-1' }, { isUsed: true });
  });

  it('in production an unconfigured mailer is a failure too', async () => {
    process.env.NODE_ENV = 'production';
    const { svc } = build({ status: 'skipped', reason: 'not_configured' });
    await expect(
      svc.requestOtp({ email: 'dev@bank.com.kh', purpose: 'EMAIL_VERIFICATION' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('in development a skipped send still succeeds (the code is in the DUMMY log), flagged as not dispatched', async () => {
    process.env.NODE_ENV = 'development';
    const { svc, otpRepo } = build({ status: 'skipped', reason: 'not_configured' });
    const r = await svc.requestOtp({ email: 'dev@bank.com.kh', purpose: 'EMAIL_VERIFICATION' });
    expect(r.emailDispatched).toBe(false);
    expect(otpRepo.update).not.toHaveBeenCalled();
  });
});
