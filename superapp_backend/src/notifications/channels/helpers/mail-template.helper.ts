import { EmailLayoutOptions, SecurityValidationFinding } from './mail.types';

export class MailTemplateHelper {
  /**
   * HTML-escapes strings to safely interpolate within email HTML.
   */
  public static escapeHtml(value?: string): string {
    if (!value) return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Standardizes the outer responsive email card structure.
   */
  public static renderEmailLayout(options: EmailLayoutOptions): string {
    const {
      category,
      categoryColor = '#38bdf8',
      title,
      borderAccentColor = '#0284c7',
      contentHtml,
      signatureTeam = 'SuperApp Governance Team',
    } = options;

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid ${borderAccentColor};">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${categoryColor}; font-weight: 700;">${category}</span>
          <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">${title}</h1>
        </div>
        <div style="padding: 32px 24px;">
          ${contentHtml}

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
          <p style="margin: 0; font-size: 13px; color: #64748b;">Best regards,</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">${signatureTeam}</p>
        </div>
      </div>
    `;
  }

  public static renderTestEmail(
    userName: string,
    toEmail: string,
  ): { subject: string; html: string } {
    const name = userName || 'User';
    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello <strong>${this.escapeHtml(name)}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        This is a verified test email sent directly from the SuperApp Backoffice notification engine.
      </p>
      
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 0.5px; margin-bottom: 8px;">Delivery Status</div>
        <div style="display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 700;">
          ACTIVE &amp; VERIFIED
        </div>
        <p style="margin: 12px 0 0 0; font-size: 13px; color: #15803d; line-height: 1.5;">
          Your registered email address (<code>${this.escapeHtml(toEmail)}</code>) is receiving automated security compliance audits, approval certificates, and release updates.
        </p>
      </div>
    `;

    return {
      subject: 'Test Notification: SuperApp Email Gateway',
      html: this.renderEmailLayout({
        category: 'FSA SuperApp Platform',
        categoryColor: '#38bdf8',
        title: 'Email Notification Test',
        borderAccentColor: '#0284c7',
        contentHtml,
        signatureTeam: 'SuperApp Governance',
      }),
    };
  }

  public static renderEmailVerification(
    name: string,
    verifyUrl: string,
    otpCode?: string,
  ): { subject: string; html: string } {
    const escName = this.escapeHtml(name);
    const escUrl = this.escapeHtml(verifyUrl);

    let tokenCode = '';
    try {
      const match = verifyUrl.match(/[?&]token=([^&]+)/);
      if (match) tokenCode = decodeURIComponent(match[1]);
    } catch {
      tokenCode = '';
    }
    const escToken = this.escapeHtml(tokenCode || verifyUrl);
    const displayOtp = otpCode ? otpCode.trim() : (tokenCode && tokenCode.length === 6 ? tokenCode : '');

    const otpSectionHtml = displayOtp
      ? `
      <div style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 24px 16px; margin: 24px 0; text-align: center;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 1.5px; margin-bottom: 8px;">
          YOUR 6-DIGIT VERIFICATION CODE
        </div>
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; font-size: 38px; font-weight: 800; color: #166534; letter-spacing: 8px; line-height: 1.2;">
          ${displayOtp}
        </div>
        <div style="font-size: 12px; color: #15803d; margin-top: 8px; font-weight: 500;">
          Enter this code in your SuperApp to verify your email.
        </div>
      </div>
      `
      : `
      <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px;">Your Verification Code / Token</div>
        <div style="font-family: monospace, Courier, monospace; font-size: 18px; font-weight: 700; color: #0284c7; letter-spacing: 1px; word-break: break-all; user-select: all;">
          ${escToken}
        </div>
      </div>
      `;

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0; color: #1e293b;">Hello <strong>${escName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Thank you for registering with the FSA SuperApp Platform. Please verify your email address to complete your registration and activate your mobile account.
      </p>

      ${otpSectionHtml}

     <div style="text-align: center; margin: 24px 0;">
       <a href="${escUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.25);">
         Open in SuperApp &rarr;
       </a>
       <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">
         Tap to open the SuperApp and verify automatically on your mobile device.
       </p>
     </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Direct Deep Link / Legacy Token (for copy-pasting if needed):</p>
        <code style="font-size: 10px; color: #64748b; word-break: break-all; background: #f8fafc; padding: 6px 8px; border-radius: 4px; display: block; border: 1px solid #e2e8f0;">${escUrl}</code>
      </div>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-top: 20px;">If you did not create this account you can safely ignore this email.</p>
    `;

    return {
      subject: 'Verify your SuperApp email address',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
          <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #16a34a;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #4ade80; font-weight: 700;">FSA SuperApp</span>
            <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Verify Your Email Address</h1>
          </div>
          <div style="padding: 32px 24px;">
            ${contentHtml}
          </div>
        </div>
      `,
    };
  }

  public static renderBackofficeEmailVerification(
    name: string,
    otpCode: string,
    verifyUrl?: string,
    expiresInMinutes: number = 5,
  ): { subject: string; html: string } {
    const escName = this.escapeHtml(name || 'Developer');
    const escCode = this.escapeHtml(otpCode.trim());
    const escUrl = verifyUrl ? this.escapeHtml(verifyUrl) : '';

    const webLinkHtml = escUrl
      ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${escUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.25);">
          Verify in Backoffice Portal &rarr;
        </a>
        <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">
          Or navigate to the verification page and enter the code above.
        </p>
      </div>
      `
      : '';

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0; color: #1e293b;">Hello <strong>${escName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Thank you for registering with the <strong>FSA SuperApp Backoffice Portal</strong>. Please verify your email address to confirm your administrative and developer account access.
      </p>

      <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 8px;">
          Your 6-Digit Verification Code
        </div>
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; font-family: 'Courier New', Courier, monospace; padding: 6px 0;">
          ${escCode}
        </div>
        <div style="font-size: 12px; color: #f59e0b; margin-top: 8px; font-weight: 600;">
          ⏱️ Valid for ${expiresInMinutes} minutes &bull; Single-use only
        </div>
      </div>

      ${webLinkHtml}

      <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 4px; margin-top: 24px;">
        <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.5;">
          <strong>Security Notice:</strong> Do not share this verification code with anyone. Once verified, developer accounts undergo review by a Platform Super Administrator before access is granted.
        </p>
      </div>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-top: 20px;">
        If you did not request this verification code or register for an account, please safely ignore this email.
      </p>
    `;

    return {
      subject: `FSA Backoffice — Email Verification Code: ${otpCode.trim()}`,
      html: this.renderEmailLayout({
        category: 'FSA Backoffice Portal',
        categoryColor: '#38bdf8',
        title: 'Verify Your Backoffice Account',
        borderAccentColor: '#0284c7',
        contentHtml,
        signatureTeam: 'FSA Platform Governance Team',
      }),
    };
  }

  public static renderAccountDeletionScheduled(
    name: string,
    purgeDate: string,
  ): { subject: string; html: string } {
    const escName = this.escapeHtml(name);
    const escDate = this.escapeHtml(purgeDate);
    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello <strong>${escName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        We received a request to delete your Super App account. You have been signed out on all devices.
        Your account and its data will be permanently deleted on <strong>${escDate}</strong>.
      </p>
      <p style="font-size: 14px; line-height: 1.6;">Changed your mind? Simply sign in to the app before that date and your account will be restored.</p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">If you did not request this, sign in now to cancel it and change your password.</p>
    `;
    return {
      subject: 'Your Super App account will be deleted',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #dc2626;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: 700;">Super App</span>
            <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Account deletion scheduled</h1>
          </div>
          <div style="padding: 32px 24px;">
            ${contentHtml}
          </div>
        </div>
      `,
    };
  }

  public static renderRegistrationSuccessEmail(appName: string): {
    subject: string;
    html: string;
  } {
    const escAppName = this.escapeHtml(appName);
    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        Your mini app <strong>"${escAppName}"</strong> has successfully completed initial registration and passed preliminary integration checks.
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
        You can manage credentials, webhooks, and revisions directly from the SuperApp Portal.
      </p>
    `;

    return {
      subject: `MiniApp Registration Successful: ${appName}`,
      html: this.renderEmailLayout({
        category: 'FSA SuperApp Platform',
        categoryColor: '#38bdf8',
        title: 'MiniApp Registration Successful',
        borderAccentColor: '#0284c7',
        contentHtml,
        signatureTeam: 'SuperApp Administration Team',
      }),
    };
  }

  public static renderValidationPassedEmail(
    appName: string,
    score: number,
    detailsUrl: string,
  ): { subject: string; html: string } {
    const escAppName = this.escapeHtml(appName);
    const escUrl = this.escapeHtml(detailsUrl);
    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        The automated security validation pipeline for MiniApp <strong>"${escAppName}"</strong> has completed successfully with all compliance criteria verified.
      </p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #15803d; letter-spacing: 0.5px;">Compliance Score</span>
        <div style="font-size: 36px; font-weight: 900; color: #166534; margin: 4px 0;">${score} / 100</div>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #15803d;">Network SSRF, TLS 1.2+, ZAP DAST, and Nuclei Exposure checks passed.</p>
      </div>

      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        The application status has progressed to <strong>IN_REVIEW</strong> and has been queued for SuperApp Administrator review.
      </p>

      <div style="text-align: left; margin: 28px 0;">
        <a href="${escUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Full Security Report
        </a>
      </div>
    `;

    return {
      subject: `Security Validation Passed: MiniApp "${appName}" (${score}/100)`,
      html: this.renderEmailLayout({
        category: 'Security & Compliance Gate',
        categoryColor: '#34d399',
        title: 'Security Validation Passed',
        borderAccentColor: '#059669',
        contentHtml,
        signatureTeam: 'SuperApp Security Governance',
      }),
    };
  }

  public static renderValidationFailedEmail(
    appName: string,
    score: number,
    findings: SecurityValidationFinding[],
    detailsUrl: string,
  ): { subject: string; html: string } {
    const escAppName = this.escapeHtml(appName);
    const escUrl = this.escapeHtml(detailsUrl);

    const findingsHtml = findings
      .map(
        (f) => `
      <li style="margin-bottom: 12px; font-size: 13px; list-style-type: none; border-bottom: 1px solid #fecdd3; padding-bottom: 10px;">
        <div style="margin-bottom: 4px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background: ${f.severity === 'CRITICAL' ? '#fee2e2; color: #991b1b; border: 1px solid #fca5a5;' : '#fef3c7; color: #92400e; border: 1px solid #fcd34d;'}">${this.escapeHtml(f.severity)}</span>
          <strong style="margin-left: 6px; color: #0f172a;">${this.escapeHtml(f.title)}</strong>
        </div>
        <p style="margin: 4px 0 0 0; color: #475569; font-size: 12px; line-height: 1.4;">${this.escapeHtml(f.description)}</p>
        ${f.recommendation ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #059669;"><strong>Remediation:</strong> ${this.escapeHtml(f.recommendation)}</p>` : ''}
      </li>
    `,
      )
      .join('');

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        The automated security validation pipeline for MiniApp <strong>"${escAppName}"</strong> identified security findings that require remediation before the application can proceed to review.
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
        <a href="${escUrl}" style="display: inline-block; background: #e11d48; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Open Backoffice to Remediate
        </a>
      </div>
    `;

    return {
      subject: `Security Validation Action Required: MiniApp "${appName}" (${findings.length} findings)`,
      html: this.renderEmailLayout({
        category: 'Security & Compliance Gate',
        categoryColor: '#fb7185',
        title: 'Security Validation Action Required',
        borderAccentColor: '#e11d48',
        contentHtml,
        signatureTeam: 'SuperApp Security Governance',
      }),
    };
  }

  public static renderRegistrationFailureEmail(
    appName: string,
    errors: Record<string, string>,
  ): { subject: string; html: string } {
    const escAppName = this.escapeHtml(appName);
    const errorListHtml = Object.entries(errors)
      .map(
        ([field, message]) => `
        <li style="margin-bottom: 8px; font-size: 13px;">
          <strong style="color: #0f172a;">${this.escapeHtml(field)}:</strong>
          <span style="color: #475569; margin-left: 4px;">${this.escapeHtml(message)}</span>
        </li>
      `,
      )
      .join('');

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        Validation issues were encountered during the registration process for MiniApp <strong>"${escAppName}"</strong>.
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
        Please resolve these errors in the SuperApp Portal before resubmitting the application.
      </p>
    `;

    return {
      subject: `Action Required: MiniApp Registration Issues (${appName})`,
      html: this.renderEmailLayout({
        category: 'FSA SuperApp Platform',
        categoryColor: '#fb7185',
        title: 'Registration Issues Detected',
        borderAccentColor: '#e11d48',
        contentHtml,
        signatureTeam: 'SuperApp Administration Team',
      }),
    };
  }

  public static renderTestBuildReadyEmail(
    appName: string,
    version: string,
    apkUrl: string,
    sandboxUrl: string,
  ): { subject: string; html: string } {
    const rawVersion = version || '1.0.0';
    const displayVersion = rawVersion.startsWith('v')
      ? rawVersion
      : `v${rawVersion}`;
    const escAppName = this.escapeHtml(appName);
    const escDisplayVersion = this.escapeHtml(displayVersion);
    const escApkUrl = this.escapeHtml(apkUrl);
    const escSandboxUrl = this.escapeHtml(sandboxUrl);

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        MiniApp <strong>"${escAppName}"</strong> (version <code>${escDisplayVersion}</code>) has been approved for integration verification in the SuperApp sandbox environment.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 12px;">
          Testing Channels
        </div>
        <div style="margin-top: 8px;">
          <a href="${escApkUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; margin-right: 8px; margin-bottom: 8px;">
            Download Test APK
          </a>
          <a href="${escSandboxUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; margin-bottom: 8px;">
            Launch SuperApp Sandbox
          </a>
        </div>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.4;">
          Hosted via the Sonatype Nexus trusted binary repository. Includes native bridge emulation, biometric validation, and hardware permissions testing.
        </p>
      </div>

      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Please perform end-to-end user journey verification. Once testing criteria are satisfied, the SuperApp Administrator will perform final authorization for production rollout.
      </p>
    `;

    return {
      subject: `Test Build Available: MiniApp "${appName}" (${displayVersion})`,
      html: this.renderEmailLayout({
        category: 'Integration & Verification Environment',
        categoryColor: '#818cf8',
        title: 'SuperApp Test Build Available',
        borderAccentColor: '#6366f1',
        contentHtml,
        signatureTeam: 'SuperApp Integration Operations',
      }),
    };
  }

  public static renderTestBuildFailedEmail(
    appName: string,
    version: string,
    errorMessage: string,
    detailsUrl: string,
  ): { subject: string; html: string } {
    const rawVersion = version || '1.0.0';
    const displayVersion = rawVersion.startsWith('v')
      ? rawVersion
      : `v${rawVersion}`;
    const escAppName = this.escapeHtml(appName);
    const escDisplayVersion = this.escapeHtml(displayVersion);
    const escError = this.escapeHtml(errorMessage);
    const escDetailsUrl = this.escapeHtml(detailsUrl);

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        The SuperApp test build compilation for MiniApp <strong>"${escAppName}"</strong> (version <code>${escDisplayVersion}</code>) has encountered an error during pipeline execution.
      </p>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #b91c1c; letter-spacing: 0.5px; margin-bottom: 8px;">
          Build Error Diagnostic
        </div>
        <pre style="margin: 0; padding: 12px; background: #ffffff; border: 1px solid #fca5a5; border-radius: 6px; font-family: monospace; font-size: 13px; color: #991b1b; white-space: pre-wrap; word-break: break-word;">${escError}</pre>
        <div style="margin-top: 16px;">
          <a href="${escDetailsUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 13px;">
            Inspect Build Diagnostics in Backoffice
          </a>
        </div>
      </div>

      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Please review the pipeline logs, verify package dependencies or manifest settings, and retry the build from the Backoffice portal.
      </p>
    `;

    return {
      subject: `🚨 Build Failed: MiniApp "${appName}" (${displayVersion})`,
      html: this.renderEmailLayout({
        category: 'Fastlane CI Pipeline Alert',
        categoryColor: '#ef4444',
        title: 'SuperApp Test Build Failed',
        borderAccentColor: '#dc2626',
        contentHtml,
        signatureTeam: 'SuperApp Engineering Operations',
      }),
    };
  }

  public static renderMiniAppApprovedEmail(
    appName: string,
    detailsUrl: string,
  ): { subject: string; html: string } {
    const escAppName = this.escapeHtml(appName);
    const escUrl = this.escapeHtml(detailsUrl);

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        Great news! Your MiniApp <strong>"${escAppName}"</strong> has been formally approved by the SuperApp Administrator after security compliance validation and review.
      </p>
      
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 0.5px; margin-bottom: 8px;">Current Status</div>
        <div style="display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 700;">
          APPROVED
        </div>
        <p style="margin: 12px 0 0 0; font-size: 13px; color: #15803d; line-height: 1.5;">
          Your application is now scheduled for integration verification and testing build packaging in the SuperApp sandbox.
        </p>
      </div>

      <div style="text-align: left; margin: 28px 0;">
        <a href="${escUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View MiniApp in Portal
        </a>
      </div>
    `;

    return {
      subject: `MiniApp Approved: "${appName}"`,
      html: this.renderEmailLayout({
        category: 'SuperApp Platform Governance',
        categoryColor: '#34d399',
        title: 'MiniApp Approved',
        borderAccentColor: '#10b981',
        contentHtml,
        signatureTeam: 'SuperApp Governance Team',
      }),
    };
  }

  public static renderMiniAppRejectedEmail(
    appName: string,
    reason: string,
    detailsUrl: string,
  ): { subject: string; html: string } {
    const escAppName = this.escapeHtml(appName);
    const escReason = this.escapeHtml(
      reason || 'Administrative policy review decision.',
    );
    const escUrl = this.escapeHtml(detailsUrl);

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        Your MiniApp <strong>"${escAppName}"</strong> was reviewed by the SuperApp Administrator and was not approved at this time.
      </p>
      
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #991b1b; letter-spacing: 0.5px; margin-bottom: 8px;">Reason / Feedback</div>
        <p style="margin: 0; font-size: 13px; color: #7f1d1d; line-height: 1.5;">
          ${escReason}
        </p>
      </div>

      <div style="text-align: left; margin: 28px 0;">
        <a href="${escUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Review Details in Portal
        </a>
      </div>
    `;

    return {
      subject: `MiniApp Review Decision: "${appName}" (Rejected)`,
      html: this.renderEmailLayout({
        category: 'SuperApp Platform Governance',
        categoryColor: '#f87171',
        title: 'MiniApp Review Decision',
        borderAccentColor: '#ef4444',
        contentHtml,
        signatureTeam: 'SuperApp Governance Team',
      }),
    };
  }

  public static renderChangesRequestedEmail(
    appName: string,
    reason: string,
    detailsUrl: string,
  ): { subject: string; html: string } {
    const escAppName = this.escapeHtml(appName);
    const escReason = this.escapeHtml(
      reason ||
      'Please review the requested changes and submit a new revision.',
    );
    const escUrl = this.escapeHtml(detailsUrl);

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        The SuperApp Administrator has reviewed MiniApp <strong>"${escAppName}"</strong> and requested revisions before approval.
      </p>
      
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #92400e; letter-spacing: 0.5px; margin-bottom: 8px;">Requested Modifications</div>
        <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">
          ${escReason}
        </p>
      </div>

      <div style="text-align: left; margin: 28px 0;">
        <a href="${escUrl}" style="display: inline-block; background: #d97706; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Update MiniApp Configuration
        </a>
      </div>
    `;

    return {
      subject: `Changes Requested: MiniApp "${appName}"`,
      html: this.renderEmailLayout({
        category: 'SuperApp Platform Governance',
        categoryColor: '#fbbf24',
        title: 'Changes Requested',
        borderAccentColor: '#f59e0b',
        contentHtml,
        signatureTeam: 'SuperApp Governance Team',
      }),
    };
  }

  public static renderMiniAppActivatedEmail(
    appName: string,
    version: string,
    detailsUrl: string,
  ): { subject: string; html: string } {
    const rawVersion = version || '1.0.0';
    const displayVersion = rawVersion.startsWith('v')
      ? rawVersion
      : `v${rawVersion}`;
    const escAppName = this.escapeHtml(appName);
    const escDisplayVersion = this.escapeHtml(displayVersion);
    const escUrl = this.escapeHtml(detailsUrl);

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        MiniApp <strong>"${escAppName}"</strong> (version <code>${escDisplayVersion}</code>) is now officially <strong>LIVE and ACTIVE</strong> in the SuperApp store catalog.
      </p>
      
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 0.5px; margin-bottom: 8px;">Release Status</div>
        <div style="display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 700;">
          ACTIVE &bull; PRODUCTION
        </div>
        <p style="margin: 12px 0 0 0; font-size: 13px; color: #15803d; line-height: 1.5;">
          Production binaries have been deployed to the SuperApp distribution network. End-users can now access your mini app seamlessly.
        </p>
      </div>

      <div style="text-align: left; margin: 28px 0;">
        <a href="${escUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Live MiniApp
        </a>
      </div>
    `;

    return {
      subject: `MiniApp Live in Catalog: "${appName}" (${displayVersion})`,
      html: this.renderEmailLayout({
        category: 'SuperApp Production Catalog',
        categoryColor: '#34d399',
        title: 'MiniApp Live & Activated',
        borderAccentColor: '#10b981',
        contentHtml,
        signatureTeam: 'SuperApp Governance Team',
      }),
    };
  }

  public static renderPasswordResetOtp(
    userName: string,
    code: string,
    expiresInMinutes: number = 5,
  ): { subject: string; html: string } {
    const escName = this.escapeHtml(userName || 'User');
    const escCode = this.escapeHtml(code);

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello <strong>${escName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        We received a request to reset your password for the <strong>FSA SuperApp Platform</strong>. Use the 6-digit recovery code below to proceed.
      </p>

      <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 10px;">
          Single-Use Recovery Code
        </div>
        <div style="font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #a3e635; font-family: 'Courier New', Courier, monospace; padding: 6px 0;">
          ${escCode}
        </div>
        <div style="font-size: 12px; color: #f59e0b; margin-top: 10px; font-weight: 600;">
          ⏱️ Valid for ${expiresInMinutes} minutes &bull; Single-use only
        </div>
      </div>

      <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 8px;">
        <strong>Security Notice:</strong> This code will expire immediately after one use. If you did not request this code, no action is needed — your account remains secure.
      </p>
    `;

    return {
      subject: `FSA SuperApp — Password Reset Code: ${code}`,
      html: this.renderEmailLayout({
        category: 'FSA Security Authority',
        categoryColor: '#f59e0b',
        title: 'Password Reset Verification',
        borderAccentColor: '#58761B',
        contentHtml,
        signatureTeam: 'FSA Security & Governance Team',
      }),
    };
  }
}
