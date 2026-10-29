import { MailService } from './mail.service';

describe('MailService.sendEmailVerification', () => {
  const build = () => {
    const svc = new MailService();
    const send = jest
      .fn<Promise<{ data: { id: string } }>, [{ html?: string; to?: string }]>()
      .mockResolvedValue({ data: { id: '1' } });
    (svc as unknown as { resend: { emails: { send: typeof send } } }).resend = {
      emails: { send },
    };
    return { svc, send };
  };

  it('HTML-escapes a hostile name and the URL', async () => {
    const { svc, send } = build();
    await svc.sendEmailVerification(
      'jane@gmail.com',
      '<img src=x onerror=1>"',
      'superapp://verify-email?token=abc&x="><script>',
    );
    const firstCallArg = send.mock.calls[0]?.[0];
    const html = firstCallArg?.html || '';
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img src=x onerror=1&gt;&quot;');
    expect(html).toContain('token=abc&amp;x=&quot;&gt;&lt;script&gt;');
    expect(firstCallArg?.to).toBe('jane@gmail.com');
  });

  it('when unconfigured logs a notice that contains neither the URL nor the token', async () => {
    const svc = new MailService();
    (svc as unknown as { resend: unknown }).resend = null;
    const logs: string[] = [];
    (svc as unknown as { logger: unknown }).logger = {
      log: (m: string) => logs.push(m),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    await svc.sendEmailVerification(
      'jane@gmail.com',
      'Jane',
      'superapp://verify-email?token=SECRETTOKEN',
    );
    expect(logs.join(' ')).not.toContain('SECRETTOKEN');
    expect(logs).toHaveLength(1);
  });
});

describe('MailService.sendAccountDeletionScheduled', () => {
  it('escapes the name and states the purge date', async () => {
    const svc = new MailService();
    const send = jest.fn().mockResolvedValue({ data: { id: '1' } });
    (svc as unknown as { resend: unknown }).resend = { emails: { send } };
    await svc.sendAccountDeletionScheduled('jane@gmail.com', '<b>Jane</b>', new Date('2026-11-01T10:00:00Z'));
    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe('jane@gmail.com');
    expect(arg.html).toContain('&lt;b&gt;Jane&lt;/b&gt;');
    expect(arg.html).toContain('2026-11-01');
    expect(arg.subject).toMatch(/deleted/i);
  });
});


describe('MailService.sendBackofficeEmailVerification', () => {
  const build = () => {
    const svc = new MailService();
    const send = jest
      .fn<Promise<{ data: { id: string } }>, [{ html?: string; to?: string; subject?: string }]>()
      .mockResolvedValue({ data: { id: '1' } });
    (svc as unknown as { resend: { emails: { send: typeof send } } }).resend = {
      emails: { send },
    };
    return { svc, send };
  };

  it('renders dedicated backoffice portal template with OTP and portal button', async () => {
    const { svc, send } = build();
    await svc.sendBackofficeEmailVerification(
      'operator@gmail.com',
      'Alice Operator',
      '654321',
      'http://localhost:3002/verify-otp?email=operator%40gmail.com',
      5,
    );
    const callArg = send.mock.calls[0]?.[0];
    expect(callArg?.to).toBe('operator@gmail.com');
    expect(callArg?.subject).toBe('FSA Backoffice — Email Verification Code: 654321');
    expect(callArg?.html).toContain('FSA SuperApp Backoffice Portal');
    expect(callArg?.html).toContain('Verify in Backoffice Portal');
    expect(callArg?.html).toContain('654321');
    expect(callArg?.html).not.toContain('activate your mobile account');
    expect(callArg?.html).not.toContain('Open in SuperApp');
  });

  it('safely escapes hostile name and verify URL', async () => {
    const { svc, send } = build();
    await svc.sendBackofficeEmailVerification(
      'admin@gmail.com',
      '<script>alert("xss")</script>',
      '123456',
      'http://localhost:3002/verify-otp?x="><script>',
    );
    const callArg = send.mock.calls[0]?.[0];
    expect(callArg?.html).not.toContain('<script>');
    expect(callArg?.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});
