import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CallbackTokenGuard } from './callback-token.guard';

const ctx = (headers: any): ExecutionContext =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as any;

const make = (token?: string) =>
  new CallbackTokenGuard({ get: () => token } as any);

describe('CallbackTokenGuard', () => {
  it('allows when token env is unset (fail-open) and warns once', () => {
    const g = make(undefined);
    const warn = jest.spyOn((g as any).logger, 'warn').mockImplementation();
    expect(g.canActivate(ctx({}))).toBe(true);
    expect(g.canActivate(ctx({}))).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('refuses in production when the token is not configured', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const g = make(undefined);
      const err = jest.spyOn((g as any).logger, 'error').mockImplementation();
      expect(() => g.canActivate(ctx({}))).toThrow('Callback token is not configured');
      expect(err).toHaveBeenCalledTimes(1);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('refuses a CHANGE_ME placeholder token in production, even when the caller sends it', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const g = make('CHANGE_ME_RELEASE_CALLBACK_TOKEN');
      const err = jest.spyOn((g as any).logger, 'error').mockImplementation();
      expect(() =>
        g.canActivate(ctx({ 'x-callback-token': 'CHANGE_ME_RELEASE_CALLBACK_TOKEN' })),
      ).toThrow('Callback token is not configured');
      expect(String(err.mock.calls[0][0])).toMatch(/placeholder/);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('built-in dev tokens no longer open a configured guard', () => {
    for (const t of ['dev-jenkins-callback-token', 'CHANGE_ME_JENKINS_CALLBACK_TOKEN']) {
      expect(() => make('s3cret').canActivate(ctx({ 'x-callback-token': t }))).toThrow();
    }
  });

  it('allows a matching token', () => {
    expect(
      make('s3cret').canActivate(ctx({ 'x-callback-token': 's3cret' })),
    ).toBe(true);
  });

  it('logs an actionable warning (never the secret) when rejecting', () => {
    const g = make('s3cret');
    const warn = jest.spyOn((g as any).logger, 'warn').mockImplementation();
    expect(() => g.canActivate(ctx({}))).toThrow(UnauthorizedException);
    expect(() =>
      g.canActivate(ctx({ 'x-callback-token': 'wrong-value' })),
    ).toThrow(UnauthorizedException);
    expect(warn).toHaveBeenCalledTimes(2);
    const text = warn.mock.calls.map((c) => String(c[0])).join('\n');
    expect(text).toContain('release-callback-token');
    expect(text).not.toContain('s3cret');
    expect(text).not.toContain('wrong-value');
  });

  it('rejects missing or wrong token with 401', () => {
    const g = make('s3cret');
    expect(() => g.canActivate(ctx({}))).toThrow(UnauthorizedException);
    expect(() => g.canActivate(ctx({ 'x-callback-token': 'nope' }))).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      g.canActivate(ctx({ 'x-callback-token': 's3cret-longer' })),
    ).toThrow(UnauthorizedException);
  });
});
