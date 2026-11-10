import { MailService } from './mail.service';
import { MailTemplateHelper } from './helpers/mail-template.helper';

type SendFn = jest.Mock<Promise<unknown>, [Record<string, unknown>]>;

function serviceWith(send: SendFn): MailService {
  const svc = new MailService();
  (svc as unknown as { resend: unknown }).resend = { emails: { send } };
  svc.fromEmail = 'notifications@fintechcenterfsa.com';
  svc.retryDelaysMs = [0, 0];
  return svc;
}

const networkError = {
  data: null,
  error: {
    name: 'application_error',
    statusCode: null,
    message: 'Unable to fetch data. The request could not be resolved.',
  },
};

describe('MailService OTP dispatch', () => {
  const OLD_REPLY_TO = process.env.RESEND_REPLY_TO;
  afterEach(() => {
    if (OLD_REPLY_TO === undefined) delete process.env.RESEND_REPLY_TO;
    else process.env.RESEND_REPLY_TO = OLD_REPLY_TO;
  });

  it('reports sent with the Resend id, and sends a text part and a Reply-To', async () => {
    const send: SendFn = jest.fn().mockResolvedValue({ data: { id: 'msg-1' }, error: null });
    const svc = serviceWith(send);

    const r = await svc.sendBackofficeEmailVerification('dev@bank.com.kh', 'Dev', '123456');

    expect(r).toEqual({ status: 'sent', id: 'msg-1' });
    const payload = send.mock.calls[0][0];
    expect(payload.replyTo).toBe('notifications@fintechcenterfsa.com');
    expect(typeof payload.text).toBe('string');
    expect(payload.text).toContain('123456');
    expect(payload.text).not.toMatch(/<[a-z]/i);
  });

  it('uses RESEND_REPLY_TO when set', async () => {
    process.env.RESEND_REPLY_TO = 'support@fintechcenterfsa.com';
    const send: SendFn = jest.fn().mockResolvedValue({ data: { id: 'x' }, error: null });
    await serviceWith(send).sendPasswordResetOtp('dev@bank.com.kh', 'Dev', '654321');
    expect(send.mock.calls[0][0].replyTo).toBe('support@fintechcenterfsa.com');
  });

  it('retries a network failure and succeeds', async () => {
    const send: SendFn = jest
      .fn()
      .mockResolvedValueOnce(networkError)
      .mockResolvedValueOnce({ data: { id: 'msg-2' }, error: null });

    const r = await serviceWith(send).sendBackofficeEmailVerification('dev@bank.com.kh', 'Dev', '111111');

    expect(send).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ status: 'sent', id: 'msg-2' });
  });

  it('retries a thrown error and 5xx/429, then reports failed after 3 attempts', async () => {
    const send: SendFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce({ data: null, error: { name: 'rate_limit_exceeded', statusCode: 429, message: 'Too many requests' } })
      .mockResolvedValueOnce({ data: null, error: { name: 'internal_server_error', statusCode: 500, message: 'Internal error' } });

    const r = await serviceWith(send).sendBackofficeEmailVerification('dev@bank.com.kh', 'Dev', '222222');

    expect(send).toHaveBeenCalledTimes(3);
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('Internal error');
  });

  it('does not retry a Resend 4xx answer (bad request is not transient)', async () => {
    const send: SendFn = jest.fn().mockResolvedValue({
      data: null,
      error: { name: 'validation_error', statusCode: 422, message: 'Invalid `to` field' },
    });

    const r = await serviceWith(send).sendPasswordResetOtp('dev@bank.com.kh', 'Dev', '333333');

    expect(send).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ status: 'failed', reason: 'Invalid `to` field' });
  });

  it('reports skipped when mail is not configured or the address is a test domain', async () => {
    const unconfigured = new MailService();
    (unconfigured as unknown as { resend: unknown }).resend = null;
    expect(await unconfigured.sendPasswordResetOtp('dev@bank.com.kh', 'Dev', '1')).toEqual({
      status: 'skipped',
      reason: 'not_configured',
    });

    const send: SendFn = jest.fn();
    expect(await serviceWith(send).sendPasswordResetOtp('dev@example.com', 'Dev', '1')).toEqual({
      status: 'skipped',
      reason: 'undeliverable_address',
    });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('MailTemplateHelper.htmlToText', () => {
  it('keeps text and link targets, drops tags, styles and entities', () => {
    const text = MailTemplateHelper.htmlToText(
      '<style>p{color:red}</style><p>Hello <strong>Dev</strong> &amp; team,</p>' +
        '<div>Code: <b>123456</b></div><a href="https://app.example.kh/verify?e=a%40b">Verify email</a>',
    );
    expect(text).toBe(
      'Hello Dev & team,\nCode: 123456\nVerify email (https://app.example.kh/verify?e=a%40b)',
    );
  });
});
