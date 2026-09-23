import { Injectable, Logger } from '@nestjs/common';
import type { Resend } from 'resend';
import { MailApiHelper } from './helpers/mail-api.helper';
import { MailTemplateHelper } from './helpers/mail-template.helper';
import {
  MailSendResult,
  SecurityValidationFinding,
  SendEmailOptions,
  EmailLayoutOptions,
} from './helpers/mail.types';

export type {
  MailSendResult,
  SecurityValidationFinding,
  SendEmailOptions,
  EmailLayoutOptions,
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiHelper: MailApiHelper;

  constructor() {
    this.apiHelper = new MailApiHelper(this.logger);
  }

  public get resend(): Resend | null {
    return this.apiHelper.resend;
  }

  public set resend(client: Resend | null) {
    this.apiHelper.resend = client;
  }

  public get fromEmail(): string {
    return this.apiHelper.fromEmail;
  }

  public set fromEmail(from: string) {
    this.apiHelper.fromEmail = from;
  }

  /**
   * Validates whether an email address is eligible for sending through live Resend API.
   * Prevents 422 errors caused by example/mock domains in sandbox mode.
   */
  public isDeliverableEmail(email?: string): boolean {
    return this.apiHelper.isDeliverableEmail(email);
  }

  /**
   * Dispatches a test email from the Backoffice portal.
   */
  async sendTestEmail(
    toEmail: string,
    userName?: string,
  ): Promise<MailSendResult> {
    const template = MailTemplateHelper.renderTestEmail(
      userName || 'User',
      toEmail,
    );
    return this.apiHelper.send(
      {
        to: toEmail,
        subject: template.subject,
        html: template.html,
      },
      this.resend,
      this.fromEmail,
    );
  }

  /**
   * Mobile end-user email verification. `verifyUrl` embeds a secret token, so it
   * must NEVER be logged (neither on success, in the dummy path, nor on error).
   */
  async sendEmailVerification(
    toEmail: string,
    name: string,
    verifyUrl: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(
        `[DUMMY] Would have sent email verification to ${toEmail} (mail is not configured)`,
      );
      return;
    }
    if (!this.isDeliverableEmail(toEmail)) {
      this.logger.debug(
        `[SKIPPED] Skipped email verification to mock/test address: ${toEmail}`,
      );
      return;
    }

    const template = MailTemplateHelper.renderEmailVerification(
      name,
      verifyUrl,
    );
    try {
      const result = await this.resend.emails.send({
        from: `Super App <${this.fromEmail}>`,
        to: toEmail,
        subject: template.subject,
        html: template.html,
      });
      if (result.error) {
        this.logger.error(
          `Resend API error sending email verification: ${result.error.message}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send email verification: ${message}`);
    }
  }

  async sendRegistrationSuccessEmail(
    toEmail: string,
    appName: string,
  ): Promise<void> {
    const template = MailTemplateHelper.renderRegistrationSuccessEmail(appName);
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Success Email to ${toEmail} for ${appName}`,
      skippedLog: `[SKIPPED] Skipped Success Email to mock/test address: ${toEmail}`,
      successLog: `Success email sent to ${toEmail} for app ${appName}`,
      errorLog: `Failed to send success email to ${toEmail}`,
    });
  }

  async sendValidationPassedEmail(
    toEmail: string,
    appName: string,
    score: number,
    detailsUrl: string,
  ): Promise<void> {
    const template = {
      ...MailTemplateHelper.renderValidationPassedEmail(
        appName,
        score,
        detailsUrl,
      ),
      from: `Super App Security Governance <${this.fromEmail}>`,
    };
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Security Passed Email to ${toEmail} for ${appName} (Score: ${score}/100)`,
      skippedLog: `[SKIPPED] Skipped Security Passed Email to mock/test address: ${toEmail}`,
      successLog: `Security validation passed email sent to ${toEmail} for ${appName}`,
      errorLog: `Failed to send security passed email to ${toEmail}`,
    });
  }

  async sendValidationFailedEmail(
    toEmail: string,
    appName: string,
    score: number,
    findings: SecurityValidationFinding[],
    detailsUrl: string,
  ): Promise<void> {
    const template = {
      ...MailTemplateHelper.renderValidationFailedEmail(
        appName,
        score,
        findings,
        detailsUrl,
      ),
      from: `Super App Security Governance <${this.fromEmail}>`,
    };
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Security Failed Email to ${toEmail} for ${appName} (Score: ${score}, Findings: ${findings.length})`,
      skippedLog: `[SKIPPED] Skipped Security Failed Email to mock/test address: ${toEmail}`,
      successLog: `Security validation failed email sent to ${toEmail} for ${appName}`,
      errorLog: `Failed to send security failed email to ${toEmail}`,
    });
  }

  async sendRegistrationFailureEmail(
    toEmail: string,
    appName: string,
    errors: Record<string, string>,
  ): Promise<void> {
    const template = MailTemplateHelper.renderRegistrationFailureEmail(
      appName,
      errors,
    );
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Failure Email to ${toEmail} for ${appName} with errors: ${JSON.stringify(errors)}`,
      skippedLog: `[SKIPPED] Skipped Failure Email to mock/test address: ${toEmail}`,
      successLog: `Failure email sent to ${toEmail} for app ${appName}`,
      errorLog: `Failed to send failure email to ${toEmail}`,
    });
  }

  async sendTestBuildReadyEmail(
    toEmail: string,
    appName: string,
    version: string,
    apkUrl: string,
    sandboxUrl: string,
  ): Promise<void> {
    const rawVersion = version || '1.0.0';
    const displayVersion = rawVersion.startsWith('v')
      ? rawVersion
      : `v${rawVersion}`;
    const template = {
      ...MailTemplateHelper.renderTestBuildReadyEmail(
        appName,
        version,
        apkUrl,
        sandboxUrl,
      ),
      from: `Super App Platform <${this.fromEmail}>`,
    };
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Test Build Email to ${toEmail} for ${appName} (APK: ${apkUrl}, Version: ${displayVersion})`,
      skippedLog: `[SKIPPED] Skipped Test Build Email to mock/test address: ${toEmail}`,
      successLog: `Test build email sent to ${toEmail} for app ${appName}`,
      errorLog: `Failed to send test build email to ${toEmail}`,
    });
  }

  async sendMiniAppApprovedEmail(
    toEmail: string,
    appName: string,
    detailsUrl: string,
  ): Promise<void> {
    const template = {
      ...MailTemplateHelper.renderMiniAppApprovedEmail(appName, detailsUrl),
      from: `Super App Governance <${this.fromEmail}>`,
    };
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Approval Email to ${toEmail} for ${appName}`,
      skippedLog: `[SKIPPED] Skipped Approval Email to mock/test address: ${toEmail}`,
      successLog: `Approval email sent to ${toEmail} for app ${appName}`,
      errorLog: `Failed to send approval email to ${toEmail}`,
    });
  }

  async sendMiniAppRejectedEmail(
    toEmail: string,
    appName: string,
    reason: string,
    detailsUrl: string,
  ): Promise<void> {
    const template = {
      ...MailTemplateHelper.renderMiniAppRejectedEmail(
        appName,
        reason,
        detailsUrl,
      ),
      from: `Super App Governance <${this.fromEmail}>`,
    };
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Rejection Email to ${toEmail} for ${appName}`,
      skippedLog: `[SKIPPED] Skipped Rejection Email to mock/test address: ${toEmail}`,
      successLog: `Rejection email sent to ${toEmail} for app ${appName}`,
      errorLog: `Failed to send rejection email to ${toEmail}`,
    });
  }

  async sendChangesRequestedEmail(
    toEmail: string,
    appName: string,
    reason: string,
    detailsUrl: string,
  ): Promise<void> {
    const template = {
      ...MailTemplateHelper.renderChangesRequestedEmail(
        appName,
        reason,
        detailsUrl,
      ),
      from: `Super App Governance <${this.fromEmail}>`,
    };
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Changes Requested Email to ${toEmail} for ${appName}`,
      skippedLog: `[SKIPPED] Skipped Changes Requested Email to mock/test address: ${toEmail}`,
      successLog: `Changes requested email sent to ${toEmail} for app ${appName}`,
      errorLog: `Failed to send changes requested email to ${toEmail}`,
    });
  }

  async sendMiniAppActivatedEmail(
    toEmail: string,
    appName: string,
    version: string,
    detailsUrl: string,
  ): Promise<void> {
    const rawVersion = version || '1.0.0';
    const displayVersion = rawVersion.startsWith('v')
      ? rawVersion
      : `v${rawVersion}`;
    const template = {
      ...MailTemplateHelper.renderMiniAppActivatedEmail(
        appName,
        version,
        detailsUrl,
      ),
      from: `Super App Governance <${this.fromEmail}>`,
    };
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Activated Email to ${toEmail} for ${appName} (${displayVersion})`,
      skippedLog: `[SKIPPED] Skipped Activated Email to mock/test address: ${toEmail}`,
      successLog: `Activation email sent to ${toEmail} for app ${appName}`,
      errorLog: `Failed to send activation email to ${toEmail}`,
    });
  }

  private async dispatchLifecycleNotification(
    toEmail: string,
    rendered: { subject: string; html: string; from?: string },
    options: {
      dummyLog: string;
      skippedLog: string;
      successLog: string;
      errorLog: string;
    },
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(options.dummyLog);
      return;
    }

    if (!this.isDeliverableEmail(toEmail)) {
      this.logger.debug(options.skippedLog);
      return;
    }

    try {
      const from = rendered.from || `Super App <${this.fromEmail}>`;
      const result = await this.resend.emails.send({
        from,
        to: toEmail,
        subject: rendered.subject,
        html: rendered.html,
      });

      if (result.error) {
        this.logger.error(`${options.errorLog}: ${result.error.message}`);
        return;
      }

      this.logger.log(options.successLog);
    } catch (error) {
      this.logger.error(`${options.errorLog}:`, error);
    }
  }
}
