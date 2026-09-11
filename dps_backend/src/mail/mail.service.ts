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
      this.logger.warn(
        'RESEND_API_KEY is missing or invalid. Emails will not be sent.',
      );
    }

    if (process.env.RESEND_FROM_EMAIL) {
      this.fromEmail = process.env.RESEND_FROM_EMAIL;
    }
  }

  async sendTestEmail(
    toEmail: string,
    userName?: string,
  ): Promise<{ success: boolean; message?: string; id?: string }> {
    if (!this.resend) {
      return {
        success: false,
        message: 'RESEND_API_KEY is not configured on the backend server.',
      };
    }

    try {
      const name = userName || 'User';
      const result = await this.resend.emails.send({
        from: `DPS Super App <${this.fromEmail}>`,
        to: toEmail,
        subject: 'Test Notification: DPS Super App Email Gateway',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #0284c7;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: 700;">DPS Super App Gateway</span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Email Notification Test</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello <strong>${name}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.6;">
                This is a verified test email sent directly from the DPS Super App Backoffice notification engine.
              </p>
              
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 0.5px; margin-bottom: 8px;">Delivery Status</div>
                <div style="display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 700;">
                  ACTIVE &amp; VERIFIED
                </div>
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #15803d; line-height: 1.5;">
                  Your registered email address (<code>${toEmail}</code>) is receiving automated security compliance audits, approval certificates, and release updates.
                </p>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
              <p style="margin: 0; font-size: 13px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">DPS Super App Governance</p>
            </div>
          </div>
        `,
      });

      if (result.error) {
        this.logger.error(`Resend API Error: ${result.error.message}`);
        return {
          success: false,
          message: result.error.message,
        };
      }

      this.logger.log(`Test email sent successfully to ${toEmail} (ID: ${result.data?.id})`);
      return {
        success: true,
        id: result.data?.id,
        message: `Test email dispatched successfully to ${toEmail}!`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to send test email: ${err.message}`);
      return {
        success: false,
        message: err.message,
      };
    }
  }

  async sendRegistrationSuccessEmail(toEmail: string, appName: string) {
    if (!this.resend) {
      this.logger.log(
        `[DUMMY] Would have sent Success Email to ${toEmail} for ${appName}`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: `DPS Mini App Gateway <${this.fromEmail}>`,
        to: toEmail,
        subject: `Mini App Registration Successful: ${appName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #0284c7;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: 700;">DPS Mini App Gateway</span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Mini App Registration Successful</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
              <p style="font-size: 14px; line-height: 1.6;">
                Your mini app <strong>"${appName}"</strong> has successfully completed initial registration and passed preliminary integration checks.
              </p>
              
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 8px;">Application Status</div>
                <div style="display: inline-block; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 700;">
                  DRAFT
                </div>
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #475569; line-height: 1.5;">
                  Your mini app is ready for configuration and testing. You may submit the application for security validation and final administrative review whenever you are prepared.
                </p>
              </div>

              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                You can manage credentials, webhooks, and revisions directly from the DPS Administration Portal.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
              <p style="margin: 0; font-size: 13px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">DPS Administration Team</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Success email sent to ${toEmail} for app ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to send success email to ${toEmail}:`, error);
    }
  }

  async sendValidationPassedEmail(
    toEmail: string,
    appName: string,
    score: number,
    detailsUrl: string,
  ) {
    if (!this.resend) {
      this.logger.log(
        `[DUMMY] Would have sent Security Passed Email to ${toEmail} for ${appName} (Score: ${score}/100)`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: `Super App Security Governance <${this.fromEmail}>`,
        to: toEmail,
        subject: `Security Validation Passed: Mini App "${appName}" (${score}/100)`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #059669;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #34d399; font-weight: 700;">Security &amp; Compliance Gate</span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Security Validation Passed</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
              <p style="font-size: 14px; line-height: 1.6;">
                The automated security validation pipeline for Mini App <strong>"${appName}"</strong> has completed successfully with all compliance criteria verified.
              </p>

              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
                <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #15803d; letter-spacing: 0.5px;">Compliance Score</span>
                <div style="font-size: 36px; font-weight: 900; color: #166534; margin: 4px 0;">${score} / 100</div>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #15803d;">Network SSRF, TLS 1.2+, ZAP DAST, and Nuclei Exposure checks passed.</p>
              </div>

              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                The application status has progressed to <strong>IN_REVIEW</strong> and has been queued for Super App Administrator review.
              </p>

              <div style="text-align: left; margin: 28px 0;">
                <a href="${detailsUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  View Full Security Report
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
              <p style="margin: 0; font-size: 13px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">Super App Security Governance</p>
            </div>
          </div>
        `,
      });
      this.logger.log(
        `Security validation passed email sent to ${toEmail} for ${appName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send security passed email to ${toEmail}:`,
        error,
      );
    }
  }

  async sendValidationFailedEmail(
    toEmail: string,
    appName: string,
    score: number,
    findings: Array<{
      severity: string;
      title: string;
      description: string;
      recommendation?: string;
    }>,
    detailsUrl: string,
  ) {
    if (!this.resend) {
      this.logger.log(
        `[DUMMY] Would have sent Security Failed Email to ${toEmail} for ${appName} (Score: ${score}, Findings: ${findings.length})`,
      );
      return;
    }

    const findingsHtml = findings
      .map(
        (f) => `
      <li style="margin-bottom: 12px; font-size: 13px; list-style-type: none; border-bottom: 1px solid #fecdd3; padding-bottom: 10px;">
        <div style="margin-bottom: 4px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background: ${f.severity === 'CRITICAL' ? '#fee2e2; color: #991b1b; border: 1px solid #fca5a5;' : '#fef3c7; color: #92400e; border: 1px solid #fcd34d;'}">${f.severity}</span>
          <strong style="margin-left: 6px; color: #0f172a;">${f.title}</strong>
        </div>
        <p style="margin: 4px 0 0 0; color: #475569; font-size: 12px; line-height: 1.4;">${f.description}</p>
        ${f.recommendation ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #059669;"><strong>Remediation:</strong> ${f.recommendation}</p>` : ''}
      </li>
    `,
      )
      .join('');

    try {
      await this.resend.emails.send({
        from: `Super App Security Governance <${this.fromEmail}>`,
        to: toEmail,
        subject: `Security Validation Action Required: Mini App "${appName}" (${findings.length} findings)`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #e11d48;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #fb7185; font-weight: 700;">Security &amp; Compliance Gate</span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Security Validation Action Required</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
              <p style="font-size: 14px; line-height: 1.6;">
                The automated security validation pipeline for Mini App <strong>"${appName}"</strong> identified security findings that require remediation before the application can proceed to review.
              </p>

              <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <div style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #9f1239; letter-spacing: 0.5px;">
                  Identified Security Findings (${findings.length})
                </div>
                <ul style="margin: 0; padding: 0;">
                  ${findingsHtml}
                </ul>
              </div>

              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                The application status has been returned to <strong>DRAFT</strong>. Please address the items listed above and re-trigger validation.
              </p>

              <div style="text-align: left; margin: 28px 0;">
                <a href="${detailsUrl}" style="display: inline-block; background: #e11d48; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Open Backoffice to Remediate
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
              <p style="margin: 0; font-size: 13px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">Super App Security Governance</p>
            </div>
          </div>
        `,
      });
      this.logger.log(
        `Security validation failed email sent to ${toEmail} for ${appName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send security failed email to ${toEmail}:`,
        error,
      );
    }
  }

  async sendRegistrationFailureEmail(
    toEmail: string,
    appName: string,
    errors: Record<string, string>,
  ) {
    if (!this.resend) {
      this.logger.log(
        `[DUMMY] Would have sent Failure Email to ${toEmail} for ${appName} with errors: ${JSON.stringify(errors)}`,
      );
      return;
    }

    const errorListHtml = Object.entries(errors)
      .map(
        ([field, message]) => `
        <li style="margin-bottom: 8px; font-size: 13px;">
          <strong style="color: #0f172a;">${field}:</strong>
          <span style="color: #475569; margin-left: 4px;">${message}</span>
        </li>
      `,
      )
      .join('');

    try {
      await this.resend.emails.send({
        from: `DPS Mini App Gateway <${this.fromEmail}>`,
        to: toEmail,
        subject: `Action Required: Mini App Registration Issues (${appName})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #e11d48;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #fb7185; font-weight: 700;">DPS Mini App Gateway</span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Registration Issues Detected</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
              <p style="font-size: 14px; line-height: 1.6;">
                Validation issues were encountered during the registration process for Mini App <strong>"${appName}"</strong>.
              </p>

              <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 18px; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #9f1239; letter-spacing: 0.5px; margin-bottom: 10px;">
                  Validation Errors
                </div>
                <ul style="margin: 0; padding-left: 18px;">
                  ${errorListHtml}
                </ul>
              </div>

              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Please resolve these errors in the DPS Administration Portal before resubmitting the application.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
              <p style="margin: 0; font-size: 13px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">DPS Administration Team</p>
            </div>
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
      this.logger.log(
        `[DUMMY] Would have sent Test Build Email to ${toEmail} for ${appName} (APK: ${apkUrl})`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: `Super App Platform <${this.fromEmail}>`,
        to: toEmail,
        subject: `Test Build Available: Mini App "${appName}" (v${version})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #6366f1;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #818cf8; font-weight: 700;">Integration &amp; Verification Environment</span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Super App Test Build Available</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
              <p style="font-size: 14px; line-height: 1.6;">
                Mini App <strong>"${appName}"</strong> (version <code>v${version}</code>) has been approved for integration verification in the Super App sandbox environment.
              </p>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 12px;">
                  Testing Channels
                </div>
                <div style="margin-top: 8px;">
                  <a href="${apkUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; margin-right: 8px; margin-bottom: 8px;">
                    Download Test APK
                  </a>
                  <a href="${sandboxUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; margin-bottom: 8px;">
                    Launch Super App Sandbox
                  </a>
                </div>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.4;">
                  Hosted via the Sonatype Nexus trusted binary repository. Includes native bridge emulation, biometric validation, and hardware permissions testing.
                </p>
              </div>

              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Please perform end-to-end user journey verification. Once testing criteria are satisfied, the Super App Administrator will perform final authorization for production rollout.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
              <p style="margin: 0; font-size: 13px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">Super App Integration Operations</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send test build email to ${toEmail}:`,
        error,
      );
    }
  }

  async sendMiniAppApprovedEmail(
    toEmail: string,
    appName: string,
    detailsUrl: string,
  ) {
    if (!this.resend) {
      this.logger.log(
        `[DUMMY] Would have sent Approval Email to ${toEmail} for ${appName}`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: `Super App Governance <${this.fromEmail}>`,
        to: toEmail,
        subject: `Mini App Approved: "${appName}"`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #10b981;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #34d399; font-weight: 700;">Super App Platform Governance</span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Mini App Approved</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
              <p style="font-size: 14px; line-height: 1.6;">
                Great news! Your Mini App <strong>"${appName}"</strong> has been formally approved by the Super App Administrator after security compliance validation and review.
              </p>
              
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 0.5px; margin-bottom: 8px;">Current Status</div>
                <div style="display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 700;">
                  APPROVED
                </div>
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #15803d; line-height: 1.5;">
                  Your application is now scheduled for integration verification and testing build packaging in the Super App sandbox.
                </p>
              </div>

              <div style="text-align: left; margin: 28px 0;">
                <a href="${detailsUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  View Mini App in Portal
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
              <p style="margin: 0; font-size: 13px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">Super App Governance Team</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Approval email sent to ${toEmail} for app ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to send approval email to ${toEmail}:`, error);
    }
  }

  async sendMiniAppRejectedEmail(
    toEmail: string,
    appName: string,
    reason: string,
    detailsUrl: string,
  ) {
    if (!this.resend) {
      this.logger.log(
        `[DUMMY] Would have sent Rejection Email to ${toEmail} for ${appName}`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: `Super App Governance <${this.fromEmail}>`,
        to: toEmail,
        subject: `Mini App Review Decision: "${appName}" (Rejected)`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #ef4444;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #f87171; font-weight: 700;">Super App Platform Governance</span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Mini App Review Decision</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
              <p style="font-size: 14px; line-height: 1.6;">
                Your Mini App <strong>"${appName}"</strong> was reviewed by the Super App Administrator and was not approved at this time.
              </p>
              
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #991b1b; letter-spacing: 0.5px; margin-bottom: 8px;">Reason / Feedback</div>
                <p style="margin: 0; font-size: 13px; color: #7f1d1d; line-height: 1.5;">
                  ${reason || 'Administrative policy review decision.'}
                </p>
              </div>

              <div style="text-align: left; margin: 28px 0;">
                <a href="${detailsUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Review Details in Portal
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
              <p style="margin: 0; font-size: 13px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">Super App Governance Team</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Rejection email sent to ${toEmail} for app ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to send rejection email to ${toEmail}:`, error);
    }
  }

  async sendChangesRequestedEmail(
    toEmail: string,
    appName: string,
    reason: string,
    detailsUrl: string,
  ) {
    if (!this.resend) {
      this.logger.log(
        `[DUMMY] Would have sent Changes Requested Email to ${toEmail} for ${appName}`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: `Super App Governance <${this.fromEmail}>`,
        to: toEmail,
        subject: `Changes Requested: Mini App "${appName}"`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #f59e0b;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #fbbf24; font-weight: 700;">Super App Platform Governance</span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Changes Requested</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
              <p style="font-size: 14px; line-height: 1.6;">
                The Super App Administrator has reviewed Mini App <strong>"${appName}"</strong> and requested revisions before approval.
              </p>
              
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 18px; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #92400e; letter-spacing: 0.5px; margin-bottom: 8px;">Requested Modifications</div>
                <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">
                  ${reason || 'Please review the requested changes and submit a new revision.'}
                </p>
              </div>

              <div style="text-align: left; margin: 28px 0;">
                <a href="${detailsUrl}" style="display: inline-block; background: #d97706; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Update Mini App Configuration
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
              <p style="margin: 0; font-size: 13px; color: #64748b;">Best regards,</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">Super App Governance Team</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Changes requested email sent to ${toEmail} for app ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to send changes requested email to ${toEmail}:`, error);
    }
  }
}
