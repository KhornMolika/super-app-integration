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
      signatureTeam = 'Super App Governance Team',
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
        This is a verified test email sent directly from the Super App Backoffice notification engine.
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
      subject: 'Test Notification: Super App Email Gateway',
      html: this.renderEmailLayout({
        category: 'Super App Gateway',
        categoryColor: '#38bdf8',
        title: 'Email Notification Test',
        borderAccentColor: '#0284c7',
        contentHtml,
        signatureTeam: 'Super App Governance',
      }),
    };
  }

  public static renderEmailVerification(
    name: string,
    verifyUrl: string,
  ): { subject: string; html: string } {
    const escName = this.escapeHtml(name);
    const escUrl = this.escapeHtml(verifyUrl);

    const contentHtml = `
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">Hello <strong>${escName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6;">
        Tap the button below on your phone to verify your email address and finish creating your account. The link expires in 24 hours.
      </p>
      <p style="margin: 24px 0;">
        <a href="${escUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 700;">Verify email</a>
      </p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">If you did not create this account you can ignore this email.</p>
    `;

    return {
      subject: 'Verify your Super App email address',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #0f172a; padding: 32px 24px; text-align: left; color: #ffffff; border-bottom: 3px solid #0284c7;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: 700;">Super App</span>
            <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Verify your email</h1>
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
        You can manage credentials, webhooks, and revisions directly from the Super App Portal.
      </p>
    `;

    return {
      subject: `Mini App Registration Successful: ${appName}`,
      html: this.renderEmailLayout({
        category: 'Super App Gateway',
        categoryColor: '#38bdf8',
        title: 'Mini App Registration Successful',
        borderAccentColor: '#0284c7',
        contentHtml,
        signatureTeam: 'Super App Administration Team',
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
        The automated security validation pipeline for Mini App <strong>"${escAppName}"</strong> has completed successfully with all compliance criteria verified.
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
        <a href="${escUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Full Security Report
        </a>
      </div>
    `;

    return {
      subject: `Security Validation Passed: Mini App "${appName}" (${score}/100)`,
      html: this.renderEmailLayout({
        category: 'Security & Compliance Gate',
        categoryColor: '#34d399',
        title: 'Security Validation Passed',
        borderAccentColor: '#059669',
        contentHtml,
        signatureTeam: 'Super App Security Governance',
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
        The automated security validation pipeline for Mini App <strong>"${escAppName}"</strong> identified security findings that require remediation before the application can proceed to review.
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
      subject: `Security Validation Action Required: Mini App "${appName}" (${findings.length} findings)`,
      html: this.renderEmailLayout({
        category: 'Security & Compliance Gate',
        categoryColor: '#fb7185',
        title: 'Security Validation Action Required',
        borderAccentColor: '#e11d48',
        contentHtml,
        signatureTeam: 'Super App Security Governance',
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
        Validation issues were encountered during the registration process for Mini App <strong>"${escAppName}"</strong>.
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
        Please resolve these errors in the Super App Portal before resubmitting the application.
      </p>
    `;

    return {
      subject: `Action Required: Mini App Registration Issues (${appName})`,
      html: this.renderEmailLayout({
        category: 'Super App Gateway',
        categoryColor: '#fb7185',
        title: 'Registration Issues Detected',
        borderAccentColor: '#e11d48',
        contentHtml,
        signatureTeam: 'Super App Administration Team',
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
        Mini App <strong>"${escAppName}"</strong> (version <code>${escDisplayVersion}</code>) has been approved for integration verification in the Super App sandbox environment.
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
    `;

    return {
      subject: `Test Build Available: Mini App "${appName}" (${displayVersion})`,
      html: this.renderEmailLayout({
        category: 'Integration & Verification Environment',
        categoryColor: '#818cf8',
        title: 'Super App Test Build Available',
        borderAccentColor: '#6366f1',
        contentHtml,
        signatureTeam: 'Super App Integration Operations',
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
        Great news! Your Mini App <strong>"${escAppName}"</strong> has been formally approved by the Super App Administrator after security compliance validation and review.
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
        <a href="${escUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Mini App in Portal
        </a>
      </div>
    `;

    return {
      subject: `Mini App Approved: "${appName}"`,
      html: this.renderEmailLayout({
        category: 'Super App Platform Governance',
        categoryColor: '#34d399',
        title: 'Mini App Approved',
        borderAccentColor: '#10b981',
        contentHtml,
        signatureTeam: 'Super App Governance Team',
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
        Your Mini App <strong>"${escAppName}"</strong> was reviewed by the Super App Administrator and was not approved at this time.
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
      subject: `Mini App Review Decision: "${appName}" (Rejected)`,
      html: this.renderEmailLayout({
        category: 'Super App Platform Governance',
        categoryColor: '#f87171',
        title: 'Mini App Review Decision',
        borderAccentColor: '#ef4444',
        contentHtml,
        signatureTeam: 'Super App Governance Team',
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
        The Super App Administrator has reviewed Mini App <strong>"${escAppName}"</strong> and requested revisions before approval.
      </p>
      
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #92400e; letter-spacing: 0.5px; margin-bottom: 8px;">Requested Modifications</div>
        <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">
          ${escReason}
        </p>
      </div>

      <div style="text-align: left; margin: 28px 0;">
        <a href="${escUrl}" style="display: inline-block; background: #d97706; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Update Mini App Configuration
        </a>
      </div>
    `;

    return {
      subject: `Changes Requested: Mini App "${appName}"`,
      html: this.renderEmailLayout({
        category: 'Super App Platform Governance',
        categoryColor: '#fbbf24',
        title: 'Changes Requested',
        borderAccentColor: '#f59e0b',
        contentHtml,
        signatureTeam: 'Super App Governance Team',
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
        Mini App <strong>"${escAppName}"</strong> (version <code>${escDisplayVersion}</code>) is now officially <strong>LIVE and ACTIVE</strong> in the Super App store catalog.
      </p>
      
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 0.5px; margin-bottom: 8px;">Release Status</div>
        <div style="display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 700;">
          ACTIVE &bull; PRODUCTION
        </div>
        <p style="margin: 12px 0 0 0; font-size: 13px; color: #15803d; line-height: 1.5;">
          Production binaries have been deployed to the Super App distribution network. End-users can now access your mini app seamlessly.
        </p>
      </div>

      <div style="text-align: left; margin: 28px 0;">
        <a href="${escUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Live Mini App
        </a>
      </div>
    `;

    return {
      subject: `Mini App Live in Catalog: "${appName}" (${displayVersion})`,
      html: this.renderEmailLayout({
        category: 'Super App Production Catalog',
        categoryColor: '#34d399',
        title: 'Mini App Live & Activated',
        borderAccentColor: '#10b981',
        contentHtml,
        signatureTeam: 'Super App Governance Team',
      }),
    };
  }
}
