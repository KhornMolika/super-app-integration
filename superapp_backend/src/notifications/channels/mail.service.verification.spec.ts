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
