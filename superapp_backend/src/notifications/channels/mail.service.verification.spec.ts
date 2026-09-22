import { MailService } from './mail.service';

describe('MailService.sendEmailVerification', () => {
  const build = () => {
    const svc = new MailService();
    const send = jest.fn().mockResolvedValue({ data: { id: '1' } });
    (svc as any).resend = { emails: { send } };
    return { svc, send };
  };

  it('HTML-escapes a hostile name and the URL', async () => {
    const { svc, send } = build();
    await svc.sendEmailVerification(
      'jane@gmail.com',
      '<img src=x onerror=1>"',
      'superapp://verify-email?token=abc&x="><script>',
    );
    const html: string = send.mock.calls[0][0].html;
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img src=x onerror=1&gt;&quot;');
    expect(html).toContain('token=abc&amp;x=&quot;&gt;&lt;script&gt;');
    expect(send.mock.calls[0][0].to).toBe('jane@gmail.com');
  });

  it('when unconfigured logs a notice that contains neither the URL nor the token', async () => {
    const svc = new MailService();
    (svc as any).resend = null;
    const logs: string[] = [];
    (svc as any).logger = { log: (m: string) => logs.push(m), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    await svc.sendEmailVerification('jane@gmail.com', 'Jane', 'superapp://verify-email?token=SECRETTOKEN');
    expect(logs.join(' ')).not.toContain('SECRETTOKEN');
    expect(logs).toHaveLength(1);
  });
});
