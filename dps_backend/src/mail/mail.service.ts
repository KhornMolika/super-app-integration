import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;
  private fromEmail = 'onboarding@resend.dev';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey !== 're_dummy_key_replace_me') {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY is missing or invalid. Emails will not be sent.');
    }
    
    if (process.env.RESEND_FROM_EMAIL) {
      this.fromEmail = process.env.RESEND_FROM_EMAIL;
    }
  }

  async sendRegistrationSuccessEmail(toEmail: string, appName: string) {
    if (!this.resend) {
      this.logger.log(`[DUMMY] Would have sent Success Email to ${toEmail} for ${appName}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: `DPS Mini-App Gateway <${this.fromEmail}>`,
        to: toEmail,
        subject: `Your Mini-App "${appName}" Registration was Successful`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #059669;">Registration Successful! 🎉</h2>
            <p>Hello,</p>
            <p>Great news! Your mini-app <strong>"${appName}"</strong> has successfully passed our automated integration checks.</p>
            <p>It is now marked as <strong>DRAFT</strong> and is ready for you to submit for final approval when you are ready.</p>
            <p>You can manage your app in the DPS Admin Portal.</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>The DPS Administration Team</strong></p>
          </div>
        `,
      });
      this.logger.log(`Success email sent to ${toEmail} for app ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to send success email to ${toEmail}:`, error);
    }
  }

  async sendRegistrationFailureEmail(toEmail: string, appName: string, errors: Record<string, string>) {
    if (!this.resend) {
      this.logger.log(`[DUMMY] Would have sent Failure Email to ${toEmail} for ${appName} with errors: ${JSON.stringify(errors)}`);
      return;
    }

    const errorListHtml = Object.entries(errors)
      .map(([field, message]) => `<li><strong>${field}:</strong> ${message}</li>`)
      .join('');

    try {
      await this.resend.emails.send({
        from: `DPS Mini-App Gateway <${this.fromEmail}>`,
        to: toEmail,
        subject: `Action Required: Mini-App "${appName}" Registration Issues`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #e11d48;">Registration Issues Detected ⚠️</h2>
            <p>Hello,</p>
            <p>We found some issues while running automated integration checks on your mini-app <strong>"${appName}"</strong>.</p>
            <p>Please review and resolve the following errors:</p>
            <ul style="background: #fff1f2; padding: 20px 40px; border-radius: 8px; color: #9f1239;">
              ${errorListHtml}
            </ul>
            <p>Your app is currently marked as having <strong>Issues</strong>. You must fix these in the DPS Admin Portal before it can be submitted.</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>The DPS Administration Team</strong></p>
          </div>
        `,
      });
      this.logger.log(`Failure email sent to ${toEmail} for app ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to send failure email to ${toEmail}:`, error);
    }
  }
}
