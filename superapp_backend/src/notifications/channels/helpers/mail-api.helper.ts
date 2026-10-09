import { Logger } from '@nestjs/common';
import { Resend } from 'resend';
import * as dns from 'dns';
import { MailSendResult, SendEmailOptions } from './mail.types';

export class MailApiHelper {
  private readonly logger: Logger;
  private currentApiKey: string | undefined;
  private cachedClient: Resend | null = null;
  public fromEmail = 'notifications@fintechcenterfsa.com';

  // Cache DNS MX validation results for 1 hour to optimize performance
  private mxCache = new Map<string, { isValid: boolean; expiresAt: number }>();

  constructor(logger?: Logger) {
    this.logger = logger || new Logger(MailApiHelper.name);
    this.initClient();
  }

  private initClient(): void {
    const apiKey = process.env.RESEND_API_KEY;
    this.currentApiKey = apiKey;
    if (apiKey && apiKey !== 're_dummy_key_replace_me') {
      this.cachedClient = new Resend(apiKey);
    } else {
      this.cachedClient = null;
      this.logger.warn(
        'RESEND_API_KEY is missing or invalid. Emails will not be sent.',
      );
    }

    if (process.env.RESEND_FROM_EMAIL) {
      this.fromEmail = process.env.RESEND_FROM_EMAIL;
    }
  }

  public get resend(): Resend | null {
    if (process.env.RESEND_API_KEY !== this.currentApiKey) {
      this.initClient();
    }
    return this.cachedClient;
  }

  public set resend(client: Resend | null) {
    this.cachedClient = client;
  }

  /**
   * Fast synchronous validation for email format and mock/example domains.
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
      'mailinator.com',
      'tempmail.com',
      'guerrillamail.com',
      '10minutemail.com',
      'throwawaymail.com',
      'trashmail.com',
      'yopmail.com',
    ];

    if (mockDomains.some((d) => domain === d || domain.endsWith(`.${d}`))) {
      return false;
    }

    return true;
  }

  /**
   * Deep asynchronous deliverability validation:
   * 1. Checks syntax & mock/disposable domain blocklist.
   * 2. Checks active DNS MX (Mail Exchange) records to verify the domain can actually receive mail.
   */
  public async validateDeliverability(
    email?: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    if (!email || !email.includes('@')) {
      return { valid: false, reason: 'Invalid email address format' };
    }

    if (!this.isDeliverableEmail(email)) {
      return {
        valid: false,
        reason: `Recipient email domain is a mock, example, or temporary email address.`,
      };
    }

    const domain = email.split('@')[1]?.toLowerCase().trim();
    if (!domain) {
      return { valid: false, reason: 'Invalid email domain' };
    }

    // Check cached DNS lookup
    const now = Date.now();
    const cached = this.mxCache.get(domain);
    if (cached && cached.expiresAt > now) {
      if (!cached.isValid) {
        return {
          valid: false,
          reason: `Domain "${domain}" has no active mail exchange (MX) DNS records to receive emails.`,
        };
      }
      return { valid: true };
    }

    // Perform live DNS MX resolution with timeout guard
    try {
      const mxRecords = await Promise.race([
        dns.promises.resolveMx(domain),
        new Promise<dns.MxRecord[]>((_, reject) =>
          setTimeout(() => reject(new Error('DNS lookup timeout')), 2500),
        ),
      ]);

      if (!mxRecords || mxRecords.length === 0) {
        this.mxCache.set(domain, { isValid: false, expiresAt: now + 3600000 });
        return {
          valid: false,
          reason: `Domain "${domain}" does not have any active mail exchange (MX) DNS records configured.`,
        };
      }

      this.mxCache.set(domain, { isValid: true, expiresAt: now + 3600000 });
      return { valid: true };
    } catch (err: any) {
      // If the domain explicitly does not exist (ENOTFOUND / ENODATA / NXDOMAIN)
      if (
        err.code === 'ENOTFOUND' ||
        err.code === 'ENODATA' ||
        err.code === 'SERVFAIL' ||
        err.code === 'NXDOMAIN'
      ) {
        this.mxCache.set(domain, { isValid: false, expiresAt: now + 3600000 });
        this.logger.warn(`Destination domain "${domain}" failed MX check: ${err.code}`);
        return {
          valid: false,
          reason: `Domain "${domain}" does not exist or has no active mail servers (DNS: ${err.code}).`,
        };
      }

      // If timeout or transient network issue, fail-safe open to avoid blocking legitimate sends
      this.logger.debug(
        `DNS MX lookup for "${domain}" skipped due to network/timeout: ${err.message}`,
      );
      return { valid: true };
    }
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

    const validation = await this.validateDeliverability(toAddress);
    if (!validation.valid) {
      this.logger.warn(`Skipping email dispatch to ${toAddress}: ${validation.reason}`);
      return {
        success: false,
        message: validation.reason || `Recipient email "${toAddress}" is not deliverable.`,
      };
    }

    try {
      const from = options.from || `FSA SuperApp <${fromDomain}>`;
      this.logger.log(`Dispatching email -> From: "${from}", To: "${options.to}"`);
      const result = await client.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (result.error) {
        this.logger.error(`Resend API Error: ${result.error.message}`);
        let friendlyMessage = result.error.message;
        if (friendlyMessage.includes('You can only send testing emails to your own email address')) {
          friendlyMessage = `Resend Sandbox Mode: Your API key is registered to molikakhorn71@gmail.com. In sandbox mode, emails can only be sent to this owner address. To send to @superapp.gov.kh, verify the domain at resend.com/domains.`;
        }
        return {
          success: false,
          message: friendlyMessage,
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
