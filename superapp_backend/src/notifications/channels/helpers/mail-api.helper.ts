import { Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { MailSendResult, SendEmailOptions } from './mail.types';

export class MailApiHelper {
  private readonly logger: Logger;
  public resend: Resend | null = null;
  public fromEmail = 'onboarding@resend.dev';

  constructor(logger?: Logger) {
    this.logger = logger || new Logger(MailApiHelper.name);

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey !== 're_dummy_key_replace_me') {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY is missing or invalid. Emails will not be sent.',
      );
    }

    if (process.env.RESEND_FROM_EMAIL) {
      this.fromEmail = process.env.RESEND_FROM_EMAIL;
    }
  }

  /**
   * Validates whether an email address is eligible for sending through live Resend API.
   * Prevents 422 errors caused by example/mock domains in sandbox mode.
   */
  public isDeliverableEmail(email?: string): boolean {
    if (!email || !email.includes('@')) return false;
    const domain = email.split('@')[1]?.toLowerCase().trim();
    if (!domain) return false;

    const mockDomains = [
      'example.com',
      'example.org',
      'example.net',
      'test.com',
      'dummy.com',
      'sample.com',
      'invalid',
      'localhost',
    ];

    if (mockDomains.some((d) => domain === d || domain.endsWith(`.${d}`))) {
      return false;
    }

    return true;
  }

  /**
   * Dispatches an email via the Resend API with uniform error handling.
   */
  public async send(
    options: SendEmailOptions,
    customClient?: Resend | null,
    customFromEmail?: string,
  ): Promise<MailSendResult> {
    const client = customClient !== undefined ? customClient : this.resend;
    const fromDomain = customFromEmail || this.fromEmail;
    const toAddress =
      typeof options.to === 'string' ? options.to : options.to[0];

    if (!client) {
      return {
        success: false,
        message: 'RESEND_API_KEY is not configured on the backend server.',
      };
    }

    if (!this.isDeliverableEmail(toAddress)) {
      this.logger.warn(`Skipping email dispatch to mock domain: ${toAddress}`);
      return {
        success: false,
        message: `Recipient email "${toAddress}" is an example or mock domain. Please use a real email address (e.g. your Gmail or domain) to receive test emails.`,
      };
    }

    try {
      const from = options.from || `Super App <${fromDomain}>`;
      const result = await client.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (result.error) {
        this.logger.error(`Resend API Error: ${result.error.message}`);
        return {
          success: false,
          message: result.error.message,
        };
      }

      this.logger.log(
        `Email sent successfully to ${toAddress} (ID: ${result.data?.id})`,
      );
      return {
        success: true,
        id: result.data?.id,
        message: `Email dispatched successfully to ${toAddress}!`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send email: ${message}`);
      return {
        success: false,
        message,
      };
    }
  }
}
