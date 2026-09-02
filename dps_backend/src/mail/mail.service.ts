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

  async sendValidationPassedEmail(toEmail: string, appName: string, score: number, detailsUrl: string) {
    if (!this.resend) {
      this.logger.log(`[DUMMY] Would have sent Security Passed Email to ${toEmail} for ${appName} (Score: ${score}/100)`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: `Super App Security Gate <${this.fromEmail}>`,
        to: toEmail,
        subject: `✅ Security Validation Passed: Mini App "${appName}" (${score}/100)`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 32px 24px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Security Validation Passed ✅</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Automated Security & Compliance Gate</p>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 15px; line-height: 1.6;">Hello,</p>
              <p style="font-size: 15px; line-height: 1.6;">
                Excellent news! Your Mini App <strong>"${appName}"</strong> has successfully passed the automated Jenkins security validation pipeline with a perfect compliance score.
              </p>

              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                <span style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #15803d; letter-spacing: 0.5px;">Validation Security Score</span>
                <div style="font-size: 36px; font-weight: 900; color: #166534; margin: 4px 0;">${score} / 100</div>
                <p style="margin: 0; font-size: 12px; color: #15803d;">Network SSRF, TLS/HTTPS, ZAP DAST, and Nuclei Exposure checks PASSED.</p>
              </div>

              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Your Mini App has now transitioned to <strong>IN_REVIEW</strong> and is queued for final Super App Admin inspection.
              </p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${detailsUrl}" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px;">
                  View Full Security Report →
                </a>
              </div>

              <br/>
              <p style="margin: 0; font-size: 14px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #1e293b;">Super App Security Governance</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Security validation passed email sent to ${toEmail} for ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to send security passed email to ${toEmail}:`, error);
    }
  }

  async sendValidationFailedEmail(
    toEmail: string,
    appName: string,
    score: number,
    findings: Array<{ severity: string; title: string; description: string; recommendation?: string }>,
    detailsUrl: string
  ) {
    if (!this.resend) {
      this.logger.log(`[DUMMY] Would have sent Security Failed Email to ${toEmail} for ${appName} (Score: ${score}, Findings: ${findings.length})`);
      return;
    }

    const findingsHtml = findings.map(f => `
      <li style="margin-bottom: 12px; font-size: 13px;">
        <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${f.severity === 'CRITICAL' ? '#fee2e2; color: #991b1b' : '#fef3c7; color: #92400e'}">${f.severity}</span>
        <strong>${f.title}</strong>
        <p style="margin: 4px 0 0 0; color: #475569;">${f.description}</p>
        ${f.recommendation ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: #059669;"><strong>Fix:</strong> ${f.recommendation}</p>` : ''}
      </li>
    `).join('');

    try {
      await this.resend.emails.send({
        from: `Super App Security Gate <${this.fromEmail}>`,
        to: toEmail,
        subject: `⚠️ Security Validation Failed: Mini App "${appName}" (${findings.length} findings)`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #e11d48, #be123c); padding: 32px 24px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Security Checks Failed ⚠️</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Action Required: Remediate Security Findings</p>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 15px; line-height: 1.6;">Hello,</p>
              <p style="font-size: 15px; line-height: 1.6;">
                The automated security validation pipeline for Mini App <strong>"${appName}"</strong> encountered blocking findings. Status has been reset to <strong>DRAFT</strong> for remediation.
              </p>

              <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; color: #9f1239; letter-spacing: 0.5px;">Blocking Security Findings (${findings.length})</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1e293b;">
                  ${findingsHtml}
                </ul>
              </div>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${detailsUrl}" style="display: inline-block; background: #e11d48; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px;">
                  Open Backoffice to Fix & Resubmit →
                </a>
              </div>

              <br/>
              <p style="margin: 0; font-size: 14px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #1e293b;">Super App Security Governance</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Security validation failed email sent to ${toEmail} for ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to send security failed email to ${toEmail}:`, error);
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

  async sendTestBuildReadyEmail(
    toEmail: string,
    appName: string,
    version: string,
    apkUrl: string,
    sandboxUrl: string,
  ) {
    if (!this.resend) {
      this.logger.log(`[DUMMY] Would have sent Test Build Email to ${toEmail} for ${appName} (APK: ${apkUrl})`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: `Super App Platform <${this.fromEmail}>`,
        to: toEmail,
        subject: `🧪 Test Build Ready: Mini App "${appName}" (${version})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px 24px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Super App Test Build Available 📱</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Manual Verification & Integration Sandbox</p>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 15px; line-height: 1.6;">Hello,</p>
              <p style="font-size: 15px; line-height: 1.6;">
                Great news! Mini App <strong>"${appName}"</strong> (version <code>${version}</code>) has been approved and is now ready for testing in the Super App sandbox.
              </p>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Testing Channels</h3>
                <div style="margin-top: 12px;">
                  <a href="${apkUrl}" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-right: 10px; margin-bottom: 8px;">
                    📲 Download Test APK
                  </a>
                  <a href="${sandboxUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
                    🎮 Launch Super App Sandbox
                  </a>
                </div>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b;">
                  Hosted on Sonatype Nexus Trusted Registry. Includes native bridge emulation & biometric/NFC testing.
                </p>
              </div>

              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Please conduct verification testing. When all test criteria pass, the SA Admin will issue final approval for live production release.
              </p>
              <br/>
              <p style="margin: 0; font-size: 14px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #1e293b;">Super App Integration Operations</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Test build email sent to ${toEmail} for app ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to send test build email to ${toEmail}:`, error);
    }
  }
}
