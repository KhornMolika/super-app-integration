import { Injectable, Logger } from '@nestjs/common';
import type { Resend } from 'resend';
import { MailApiHelper } from './helpers/mail-api.helper';
import { MailTemplateHelper } from './helpers/mail-template.helper';
import {
  MailDispatchResult,
  MailSendResult,
  SecurityValidationFinding,
  SendEmailOptions,
  EmailLayoutOptions,
} from './helpers/mail.types';

export type {
  MailDispatchResult,
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

  public async validateDeliverability(
    email?: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    return this.apiHelper.validateDeliverability(email);
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
    otpCode?: string,
  ): Promise<MailDispatchResult> {
    const template = MailTemplateHelper.renderEmailVerification(
      name,
      verifyUrl,
      otpCode,
    );
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent email verification to ${toEmail} (mail is not configured)`,
      skippedLog: `[SKIPPED] Skipped email verification to mock/test address: ${toEmail}`,
      successLog: `Email verification dispatched successfully to ${toEmail}`,
      errorLog: `Failed to send email verification to ${toEmail}`,
    });
  }

  /**
   * Backoffice developer/operator email verification OTP.
   */
  async sendBackofficeEmailVerification(
    toEmail: string,
    name: string,
    otpCode: string,
    verifyUrl?: string,
    expiresInMinutes: number = 5,
  ): Promise<MailDispatchResult> {
    const template = MailTemplateHelper.renderBackofficeEmailVerification(
      name,
      otpCode,
      verifyUrl,
      expiresInMinutes,
    );
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent backoffice email verification OTP (${otpCode}) to ${toEmail}`,
      skippedLog: `[SKIPPED] Skipped backoffice email verification to mock/test address: ${toEmail}`,
      successLog: `Backoffice email verification OTP dispatched successfully to ${toEmail}`,
      errorLog: `Failed to send backoffice email verification OTP to ${toEmail}`,
    });
  }

  async sendAccountDeletionScheduled(
    toEmail: string,
    name: string,
    purgeAfter: Date,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(
        `[DUMMY] Would have sent account deletion notice to ${toEmail} (mail is not configured)`,
      );
      return;
    }
    if (!this.isDeliverableEmail(toEmail)) {
      this.logger.debug(
        `[SKIPPED] Skipped account deletion notice to mock/test address: ${toEmail}`,
      );
      return;
    }
    const template = MailTemplateHelper.renderAccountDeletionScheduled(
      name,
      `${purgeAfter.toISOString().slice(0, 10)} (UTC)`,
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
          `Resend API error sending account deletion notice: ${result.error.message}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send account deletion notice: ${message}`);
    }
  }

  async sendRegistrationSuccessEmail(
    toEmail: string,
    appName: string,
  ): Promise<MailDispatchResult> {
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
  ): Promise<MailDispatchResult> {
    const template = {
      ...MailTemplateHelper.renderValidationPassedEmail(
        appName,
        score,
        detailsUrl,
      ),
      from: `SuperApp Security Governance <${this.fromEmail}>`,
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
  ): Promise<MailDispatchResult> {
    const template = {
      ...MailTemplateHelper.renderValidationFailedEmail(
        appName,
        score,
        findings,
        detailsUrl,
      ),
      from: `SuperApp Security Governance <${this.fromEmail}>`,
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
  ): Promise<MailDispatchResult> {
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
  ): Promise<MailDispatchResult> {
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
      from: `SuperApp Platform <${this.fromEmail}>`,
    };
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Test Build Email to ${toEmail} for ${appName} (APK: ${apkUrl}, Version: ${displayVersion})`,
      skippedLog: `[SKIPPED] Skipped Test Build Email to mock/test address: ${toEmail}`,
      successLog: `Test build email sent to ${toEmail} for app ${appName}`,
      errorLog: `Failed to send test build email to ${toEmail}`,
    });
  }

  async sendTestBuildFailedEmail(
    toEmail: string,
    appName: string,
    version: string,
    errorMessage: string,
    detailsUrl: string,
  ): Promise<MailDispatchResult> {
    const rawVersion = version || '1.0.0';
    const displayVersion = rawVersion.startsWith('v')
      ? rawVersion
      : `v${rawVersion}`;
    const template = {
      ...MailTemplateHelper.renderTestBuildFailedEmail(
        appName,
        version,
        errorMessage,
        detailsUrl,
      ),
      from: `SuperApp CI Pipeline <${this.fromEmail}>`,
    };
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Build Failed Email to ${toEmail} for ${appName} (${displayVersion})`,
      skippedLog: `[SKIPPED] Skipped Build Failed Email to mock/test address: ${toEmail}`,
      successLog: `Build failed email sent to ${toEmail} for app ${appName}`,
      errorLog: `Failed to send build failed email to ${toEmail}`,
    });
  }

  async sendMiniAppApprovedEmail(
    toEmail: string,
    appName: string,
    detailsUrl: string,
  ): Promise<MailDispatchResult> {
    const template = {
      ...MailTemplateHelper.renderMiniAppApprovedEmail(appName, detailsUrl),
      from: `SuperApp Governance <${this.fromEmail}>`,
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
  ): Promise<MailDispatchResult> {
    const template = {
      ...MailTemplateHelper.renderMiniAppRejectedEmail(
        appName,
        reason,
        detailsUrl,
      ),
      from: `SuperApp Governance <${this.fromEmail}>`,
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
  ): Promise<MailDispatchResult> {
    const template = {
      ...MailTemplateHelper.renderChangesRequestedEmail(
        appName,
        reason,
        detailsUrl,
      ),
      from: `SuperApp Governance <${this.fromEmail}>`,
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
  ): Promise<MailDispatchResult> {
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
      from: `SuperApp Governance <${this.fromEmail}>`,
    };
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Activated Email to ${toEmail} for ${appName} (${displayVersion})`,
      skippedLog: `[SKIPPED] Skipped Activated Email to mock/test address: ${toEmail}`,
      successLog: `Activation email sent to ${toEmail} for app ${appName}`,
      errorLog: `Failed to send activation email to ${toEmail}`,
    });
  }

  async sendPasswordResetOtp(
    toEmail: string,
    userName: string,
    code: string,
    expiresInMinutes: number = 5,
  ): Promise<MailDispatchResult> {
    const template = MailTemplateHelper.renderPasswordResetOtp(
      userName,
      code,
      expiresInMinutes,
    );
    return this.dispatchLifecycleNotification(toEmail, template, {
      dummyLog: `[DUMMY] Would have sent Password Reset OTP ${code} to ${toEmail}`,
      skippedLog: `[SKIPPED] Skipped Password Reset OTP to mock address: ${toEmail}`,
      successLog: `Password Reset OTP successfully dispatched to ${toEmail}`,
      errorLog: `Failed to send password reset OTP to ${toEmail}`,
    });
  }

  /**
   * Waits before each retry of a network-level failure. Two retries cover a
   * brief DNS or connection hiccup between the pod and Resend without making
   * an OTP request hang. Tests set this to [0, 0].
   */
  public retryDelaysMs: number[] = [500, 1500];

  /** Reply-To for transactional mail: RESEND_REPLY_TO, else the sender address. */
  private get replyTo(): string {
    return (process.env.RESEND_REPLY_TO || '').trim() || this.fromEmail;
  }

  /**
   * Sends through Resend, retrying failures that are worth retrying:
   * no HTTP response (network/DNS), 429 and 5xx. Resend's own 4xx answers
   * (bad address, unverified domain, bad key) are returned at once.
   */
  private async sendWithRetry(
    payload: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
      replyTo: string;
    },
    errorLog: string,
  ): Promise<MailDispatchResult> {
    const client = this.resend!;
    const attempts = this.retryDelaysMs.length + 1;
    let lastError = 'unknown error';

    for (let attempt = 1; attempt <= attempts; attempt++) {
      let statusCode: number | null | undefined;
      try {
        const result = await client.emails.send(payload);
        if (!result.error) {
          return { status: 'sent', id: result.data?.id };
        }
        statusCode = (result.error as { statusCode?: number | null })
          .statusCode;
        lastError = result.error.message || 'Resend returned an error';
      } catch (err) {
        statusCode = null;
        lastError = err instanceof Error ? err.message : String(err);
      }

      const transient =
        statusCode === null ||
        statusCode === undefined ||
        statusCode === 429 ||
        statusCode >= 500;
      if (!transient) {
        this.logger.error(`${errorLog}: ${lastError} (HTTP ${statusCode})`);
        return { status: 'failed', reason: lastError };
      }
      if (attempt < attempts) {
        const delay = this.retryDelaysMs[attempt - 1];
        this.logger.warn(
          `${errorLog}: ${lastError} (attempt ${attempt}/${attempts}, retrying in ${delay}ms)`,
        );
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      }
    }

    // Resend's SDK reports every network failure as "Unable to fetch data";
    // probe once so the log names the real cause (EAI_AGAIN, ETIMEDOUT, ...).
    const cause = await this.diagnoseNetwork();
    const reason = cause ? `${lastError} [network: ${cause}]` : lastError;
    this.logger.error(`${errorLog}: ${reason} (gave up after ${attempts} attempts)`);
    return { status: 'failed', reason };
  }

  /** Low-level reason Resend's API is unreachable, or null when it is reachable. */
  private async diagnoseNetwork(): Promise<string | null> {
    if (process.env.NODE_ENV === 'test') return null;
    try {
      await fetch('https://api.resend.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      });
      return null;
    } catch (err) {
      const e = err as { name?: string; message?: string; cause?: { code?: string } };
      return e.cause?.code || e.name || e.message || 'unknown';
    }
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
  ): Promise<MailDispatchResult> {
    if (!this.resend) {
      this.logger.log(options.dummyLog);
      return { status: 'skipped', reason: 'not_configured' };
    }

    if (!this.isDeliverableEmail(toEmail)) {
      this.logger.debug(options.skippedLog);
      return { status: 'skipped', reason: 'undeliverable_address' };
    }

    const from = rendered.from || `FSA SuperApp <${this.fromEmail}>`;
    const payload = {
      from,
      to: toEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: MailTemplateHelper.htmlToText(rendered.html),
      replyTo: this.replyTo,
    };
    this.logger.log(
      `Dispatching lifecycle email -> From: "${from}", To: "${toEmail}"`,
    );

    let result = await this.sendWithRetry(payload, options.errorLog);

    // Sender domain not verified in Resend: retry once from Resend's own
    // address (only reaches the account owner while the domain is unverified).
    if (
      result.status === 'failed' &&
      /not verified|domain/i.test(result.reason || '') &&
      !from.includes('onboarding@resend.dev')
    ) {
      this.logger.warn(
        `Primary sender domain not verified in Resend. Retrying with fallback onboarding@resend.dev...`,
      );
      result = await this.sendWithRetry(
        { ...payload, from: 'FSA SuperApp <onboarding@resend.dev>' },
        `${options.errorLog} (fallback sender)`,
      );
    }

    if (result.status === 'sent') {
      this.logger.log(`${options.successLog} (ID: ${result.id})`);
    }
    return result;
  }
}
