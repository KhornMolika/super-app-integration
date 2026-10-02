import { TelegramInlineButton, TelegramCardMetadata } from './telegram.types';

export class TelegramCardHelper {
  /**
   * Builds distinct, beautifully formatted Telegram status cards with action buttons
   */
  static buildRichCard(
    title: string,
    message: string,
    type: string,
    miniAppName?: string,
    metadata?: TelegramCardMetadata,
    backofficeBaseUrl: string = '',
  ): { text: string; buttons?: TelegramInlineButton[][] } {
    const appDisplayName = miniAppName || 'Super App Mini App';
    const miniAppId = metadata?.miniAppId || metadata?.id;
    const baseUrl = backofficeBaseUrl.replace(/\/+$/, '');
    const detailsUrl = miniAppId
      ? `${baseUrl}/miniapps/${miniAppId}`
      : `${baseUrl}/miniapps`;

    const buttons: TelegramInlineButton[][] = [];

    switch (type) {
      case 'MINIAPP_REGISTERED':
      case 'MINIAPP_CREATED': {
        const method = (metadata?.integrationMethod as string) || 'WEBVIEW';
        const category = (metadata?.category as string) || 'Standard';
        const teamName = (metadata?.teamName as string) || 'Engineering Team';

        const text = `
🟢 <b>[REGISTERED] NEW MINI APP REGISTERED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
🏷️ <b>Method:</b> <code>${method}</code>
📁 <b>Category:</b> ${category}
👥 <b>Team:</b> ${teamName}

<pre><code class="language-diff">
+ [REGISTERED] Application profile created
+ [STATUS]     Draft initialized & queued for verification
+ [INTEGRATION] ${method}
</code></pre>

<blockquote>Mini App <b>"${appDisplayName}"</b> has been registered on the Super App Gateway and is undergoing automated pre-flight security scanning.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>Open Mini App in Backoffice</b></a>
        `.trim();

        buttons.push([{ text: '🔍 View Mini App in Portal', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'VALIDATION_RUNNING':
      case 'SCAN_STARTED': {
        const text = `
🔵 <b>[IN PROGRESS] VALIDATION SCAN RUNNING</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
⚙️ <b>Status:</b> Automated Security Verification Started

<pre><code class="language-diff">
! Static Code SAST Scan   : In Progress...
! Package Integrity Check : Running
! Network Boundary (SSRF) : Probing
! Web Sandbox Build       : Queued
</code></pre>

<blockquote>Automated security engines are verifying network SSRF boundaries, TLS certificates, and sandboxed bridge capabilities.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>View Security Scan in Backoffice</b></a>
        `.trim();

        buttons.push([{ text: '🔍 View in Backoffice', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'VALIDATION_SUCCESS':
      case 'SECURITY_PASSED': {
        const score = metadata?.score ?? 100;
        const text = `
🟢 <b>[PASSED] AUTOMATED VALIDATION VERIFIED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
🏆 <b>Score:</b> <b>${score} / 100</b> (Compliance Verified)
🛡️ <b>Status:</b> All Security Checks Passed

<pre><code class="language-diff">
+ [PASS] Static Analysis (SAST) : 0 Critical Findings
+ [PASS] Network Boundary (SSRF): Verified Secure
+ [PASS] API Association Digest : Signature Valid
+ [PASS] Capability Gatekeeper  : Approved
</code></pre>

<blockquote>Application compliance verified. Status has advanced to <b>IN_REVIEW</b> for administrator review.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>View Full Audit Report in Backoffice</b></a>
        `.trim();

        buttons.push([
          { text: '📋 View Audit Report', url: detailsUrl },
          { text: '🔍 Open Backoffice', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      case 'VALIDATION_FAILED':
      case 'SECURITY_FAILED': {
        const score = metadata?.score ?? 0;
        const cleanIssue = message
          ? message
              .split('\n')
              .filter(Boolean)
              .map((l) => `- ${l}`)
              .join('\n')
          : '- Security compliance gate requirements not satisfied';

        const text = `
🔴 <b>[ACTION REQUIRED] VALIDATION FAILED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
⚠️ <b>Score:</b> <b>${score} / 100</b> (Violations Detected)
🛡️ <b>Status:</b> Compliance Gate Failed

<pre><code class="language-diff">
- [FAIL] Compliance Gate: Action Required
${cleanIssue}
</code></pre>

<blockquote>Please address identified security policy violations in the backoffice and re-submit for validation.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>Remediate Violations in Backoffice</b></a>
        `.trim();

        buttons.push([
          { text: '🛠️ Remediate Violations', url: detailsUrl },
          { text: '📋 View Full Report', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      case 'MINIAPP_APPROVED': {
        const text = `
🟢 <b>[APPROVED] MINI APP APPROVED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
👤 <b>Reviewer:</b> Super App Administrator
🏢 <b>Status:</b> <b>APPROVED</b> (Scheduled for Build)

<pre><code class="language-diff">
+ [APPROVED] Review Decision: Mini App Approved
+ [STATUS]   Queued for Super App assembly & test build packaging
</code></pre>

<blockquote>Mini App <b>"${appDisplayName}"</b> has been formally approved and queued for Super App test build assembly & sandbox packaging.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>View Mini App Details in Backoffice</b></a>
        `.trim();

        buttons.push([{ text: '🔍 View Mini App Details', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'BUILD_STARTED':
      case 'BUILDING': {
        const version =
          (metadata?.version as string) ||
          (metadata?.releaseVersion as string) ||
          'v1.0.0';
        const text = `
🔵 <b>[BUILDING] SUPER APP BUILD IN PROGRESS</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
🏷️ <b>Version:</b> <code>${version}</code>
⚙️ <b>Pipeline:</b> Jenkins Sandbox & Android APK Assembler

<pre><code class="language-diff">
! [BUILDING] Compiling Flutter Native Engine
! [BUILDING] Resolving Package Dependencies
! [BUILDING] Packaging Android APK & Web Sandbox
</code></pre>

<blockquote>Stand by while binary artifacts are assembled and uploaded to Sonatype Nexus repository.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>Monitor Build Progress in Backoffice</b></a>
        `.trim();

        buttons.push([{ text: '📊 View Build Progress', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'TEST_BUILD_READY': {
        const version =
          (metadata?.version as string) ||
          (metadata?.releaseVersion as string) ||
          'v1.0.0';
        const rawApkUrl = metadata?.apkUrl;
        const downloadProxyUrl = `${baseUrl}/api/download-apk?type=test&version=${encodeURIComponent(version)}&appName=superapp`;
        const apkUrl =
          rawApkUrl && !rawApkUrl.includes('host.docker.internal')
            ? rawApkUrl
            : downloadProxyUrl;
        const sandboxUrl = miniAppId
          ? `${baseUrl}/miniapps/${miniAppId}?preview=true`
          : `${baseUrl}/super-app?preview=true`;

        const text = `
🟢 <b>[BUILD READY] SUPER APP TEST BUILD READY</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
🏷️ <b>Version:</b> <code>${version}</code>
📦 <b>Artifacts:</b> Android APK & Web Sandbox Build Ready

<pre><code class="language-diff">
+ [READY] Android APK : Built & Uploaded to Nexus
+ [READY] Web Sandbox : Live & Interactive
+ [READY] Release     : ${version}
</code></pre>

<blockquote>Super App test binary packaging is complete! You can download the test APK or launch the interactive Web Sandbox.</blockquote>

🔗 <b>Action Links:</b>
📲 <a href="${apkUrl}"><b>Download Test APK (.apk)</b></a>
🌐 <a href="${sandboxUrl}"><b>Launch Interactive Web Sandbox</b></a>
🔍 <a href="${detailsUrl}"><b>View Details in Backoffice Portal</b></a>
        `.trim();

        const actionRow: TelegramInlineButton[] = [];
        if (apkUrl) {
          actionRow.push({ text: '📲 Download Test APK', url: apkUrl });
        }
        actionRow.push({ text: '🌐 Launch Sandbox', url: sandboxUrl });

        buttons.push(actionRow);
        buttons.push([{ text: '📋 View in Backoffice', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'BUILD_FAILED': {
        const version =
          (metadata?.version as string) ||
          (metadata?.releaseVersion as string) ||
          'latest';
        const cleanReason = message
          ? message
              .split('\n')
              .filter(Boolean)
              .map((l) => `- ${l}`)
              .join('\n')
          : '- Fastlane packaging or Nexus publish failed';

        const text = `
🔴 <b>[BUILD FAILED] SUPER APP BUILD ERROR</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
🏷️ <b>Version:</b> <code>${version}</code>
⚙️ <b>Pipeline:</b> Jenkins Assembler CI

<pre><code class="language-diff">
- [FAILED] Build Pipeline Failure
${cleanReason}
</code></pre>

<blockquote>The Super App build packaging failed. Please check the build logs in the portal to diagnose and remediate.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>View Build Logs & Diagnostics</b></a>
        `.trim();

        buttons.push([{ text: '🛠️ View Build Logs', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'CHANGES_REQUESTED': {
        const cleanFeedback = message
          ? message
              .split('\n')
              .filter(Boolean)
              .map((l) => `! ${l}`)
              .join('\n')
          : '! Reviewer requested revisions before approval';

        const text = `
🟡 <b>[CHANGES REQUESTED] REVIEW FEEDBACK</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
👤 <b>Reviewer:</b> Super App Administrator
📝 <b>Feedback:</b> ${message}

<pre><code class="language-diff">
! [ACTION REQUIRED] Reviewer Feedback:
${cleanFeedback}
</code></pre>

<blockquote>Please review the requested changes in the Backoffice Portal and submit an updated revision.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>Update Mini App in Backoffice</b></a>
        `.trim();

        buttons.push([{ text: '✏️ Update Mini App', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'MINIAPP_REJECTED': {
        const cleanReason = message
          ? message
              .split('\n')
              .filter(Boolean)
              .map((l) => `- ${l}`)
              .join('\n')
          : '- Submission does not meet platform integration requirements';

        const text = `
🔴 <b>[REJECTED] REVIEW DECISION: MINI APP REJECTED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
👤 <b>Decision:</b> Not Approved
📝 <b>Reason:</b> ${message}

<pre><code class="language-diff">
- [REJECTED] Submission Not Approved
${cleanReason}
</code></pre>

<blockquote>The submission for "${appDisplayName}" did not meet the required integration or compliance policies.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>View Decision in Portal</b></a>
        `.trim();

        buttons.push([{ text: '🔍 View Decision in Portal', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'REVISION_SUBMITTED': {
        const text = `
🟣 <b>[REVISION SUBMITTED] NEW REVISION INGESTED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
📝 <b>Title:</b> ${title}
📄 <b>Details:</b> ${message}

<pre><code class="language-diff">
! [REVISION] New Version Submitted
! [STATUS]   Queued for Automated Security Scanning & Admin Review
</code></pre>

<blockquote>A new revision has been submitted for automated security scanning and administrator review.</blockquote>

🔗 <b>Action Links:</b>
👉 <a href="${detailsUrl}"><b>Review Proposed Revision in Backoffice</b></a>
        `.trim();

        buttons.push([{ text: '⚖️ Review Revision', url: detailsUrl }]);
        return { text, buttons };
      }

      default: {
        const header = TelegramCardHelper.formatHeader(type);
        const isError = type.includes('ERROR') || type.includes('FAIL');
        const isSuccess = type.includes('SUCCESS') || type.includes('PASS');
        const prefix = isError ? '-' : isSuccess ? '+' : '!';
        const badge = isError ? '🔴' : isSuccess ? '🟢' : '🔵';

        const text = `
${badge} <b>${header}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>Mini App:</b> ${appDisplayName}
<b>Title:</b> ${title}

<pre><code class="language-diff">
${prefix} [DETAIL] ${message ? message.split('\n')[0] : 'Notification update'}
</code></pre>

<i>Super App Management Gateway</i>

${miniAppId ? `🔗 <b>Portal Link:</b> <a href="${detailsUrl}"><b>Open Backoffice</b></a>` : ''}
        `.trim();

        if (miniAppId) {
          buttons.push([{ text: '🔍 Open Backoffice', url: detailsUrl }]);
        }
        return { text, buttons };
      }
    }
  }

  static formatHeader(type: string): string {
    switch (type) {
      case 'SUCCESS':
        return 'Operation Completed';
      case 'ERROR':
        return 'Alert: Error Occurred';
      case 'WARNING':
        return 'Warning Notice';
      default:
        return 'Super App Notification';
    }
  }
}
