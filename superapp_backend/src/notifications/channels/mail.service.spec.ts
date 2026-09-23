import { MailService } from './mail.service';
import { MailApiHelper } from './helpers/mail-api.helper';
import { MailTemplateHelper } from './helpers/mail-template.helper';

describe('MailService & Helper Modules', () => {
  describe('MailApiHelper.isDeliverableEmail', () => {
    const helper = new MailApiHelper();

    it('identifies real deliverable domains as deliverable', () => {
      expect(helper.isDeliverableEmail('user@gmail.com')).toBe(true);
      expect(helper.isDeliverableEmail('admin@fintechcenter.org')).toBe(true);
      expect(helper.isDeliverableEmail('test.lead@mycompany.io')).toBe(true);
    });

    it('rejects invalid or empty email addresses', () => {
      expect(helper.isDeliverableEmail('')).toBe(false);
      expect(helper.isDeliverableEmail(undefined)).toBe(false);
      expect(helper.isDeliverableEmail('not-an-email')).toBe(false);
      expect(helper.isDeliverableEmail('user@')).toBe(false);
    });

    it('filters out mock and sandbox domains', () => {
      expect(helper.isDeliverableEmail('demo@example.com')).toBe(false);
      expect(helper.isDeliverableEmail('sub@demo.example.org')).toBe(false);
      expect(helper.isDeliverableEmail('test@test.com')).toBe(false);
      expect(helper.isDeliverableEmail('admin@localhost')).toBe(false);
      expect(helper.isDeliverableEmail('dummy@sample.com')).toBe(false);
    });
  });

  describe('MailTemplateHelper', () => {
    it('escapes dangerous HTML characters', () => {
      expect(
        MailTemplateHelper.escapeHtml('<script>alert("xss")</script>'),
      ).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(MailTemplateHelper.escapeHtml("Tom & Jerry's")).toBe(
        'Tom &amp; Jerry&#39;s',
      );
      expect(MailTemplateHelper.escapeHtml('')).toBe('');
      expect(MailTemplateHelper.escapeHtml(undefined)).toBe('');
    });

    it('renders test email template correctly', () => {
      const rendered = MailTemplateHelper.renderTestEmail(
        'Alice',
        'alice@example.com',
      );
      expect(rendered.subject).toContain('Test Notification');
      expect(rendered.html).toContain('Alice');
      expect(rendered.html).toContain('ACTIVE &amp; VERIFIED');
    });

    it('renders validation failed template with findings list', () => {
      const rendered = MailTemplateHelper.renderValidationFailedEmail(
        'Payment App',
        45,
        [
          {
            severity: 'CRITICAL',
            title: 'Hardcoded Secret',
            description: 'Found AWS key in source',
            recommendation: 'Use environment variables',
          },
        ],
        'https://portal.example.com/reports/123',
      );
      expect(rendered.subject).toContain('Payment App');
      expect(rendered.subject).toContain('1 findings');
      expect(rendered.html).toContain('CRITICAL');
      expect(rendered.html).toContain('Hardcoded Secret');
      expect(rendered.html).toContain('Remediation:');
    });
  });

  describe('MailService orchestration', () => {
    let service: MailService;
    let mockSend: jest.Mock;

    beforeEach(() => {
      service = new MailService();
      mockSend = jest.fn().mockResolvedValue({ data: { id: 'msg_123' } });
      (
        service as unknown as {
          resend: { emails: { send: typeof mockSend } };
        }
      ).resend = {
        emails: { send: mockSend },
      };
    });

    it('delegates test email to Resend via api helper', async () => {
      const result = await service.sendTestEmail(
        'dev@company.com',
        'Developer',
      );
      expect(result.success).toBe(true);
      expect(result.id).toBe('msg_123');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'dev@company.com',
          subject: 'Test Notification: Super App Email Gateway',
        }),
      );
    });

    it('rejects test email if recipient domain is mock domain', async () => {
      const result = await service.sendTestEmail(
        'dev@example.com',
        'Developer',
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('mock domain');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('sends registration success email', async () => {
      await service.sendRegistrationSuccessEmail(
        'dev@company.com',
        'WalletMiniApp',
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'dev@company.com',
          subject: 'Mini App Registration Successful: WalletMiniApp',
        }),
      );
    });

    it('sends test build ready email with apk and sandbox links', async () => {
      await service.sendTestBuildReadyEmail(
        'qa@company.com',
        'FinApp',
        '2.1.0',
        'https://nexus.example.com/build.apk',
        'https://sandbox.example.com/app',
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'qa@company.com',
          subject: 'Test Build Available: Mini App "FinApp" (v2.1.0)',
        }),
      );
    });
  });
});
