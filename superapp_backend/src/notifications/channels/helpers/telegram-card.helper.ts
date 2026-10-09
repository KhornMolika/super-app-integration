import { TelegramInlineButton, TelegramCardMetadata } from './telegram.types';

export class TelegramCardHelper {
  /**
   * Builds distinct, clean, modern, and minimalist Telegram status cards with action buttons
   */
  static buildRichCard(
    title: string,
    message: string,
    type: string,
    miniAppName?: string,
    metadata?: TelegramCardMetadata,
    backofficeBaseUrl: string = '',
  ): { text: string; buttons?: TelegramInlineButton[][] } {
    const appDisplayName = miniAppName || 'SuperApp MiniApp';
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
🟢 <b>NEW MINI APP REGISTERED</b>

📱 <b>App:</b> ${appDisplayName}
🏷️ <b>Method:</b> <code>${method}</code>  •  <b>Category:</b> ${category}
👥 <b>Team:</b> ${teamName}

<pre><code class="language-diff">
+ Profile      : Created & Initialized
+ Integration  : ${method}
+ Security     : Pre-flight scan queued
</code></pre>

<blockquote>MiniApp <b>"${appDisplayName}"</b> registered successfully on the SuperApp Gateway.</blockquote>
        `.trim();

        buttons.push([{ text: '🔍 View in Backoffice', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'VALIDATION_RUNNING':
      case 'SCAN_STARTED': {
        const text = `
🔵 <b>VALIDATION SCAN RUNNING</b>

📱 <b>App:</b> ${appDisplayName}
⚙️ <b>Status:</b> Automated Security Verification In Progress

<pre><code class="language-diff">
! SAST Code Scan      : Analyzing source...
! Dependency Check    : Verifying integrity
! SSRF Boundary       : Testing network scope
! Sandbox Container   : Queued
</code></pre>

<blockquote>Automated security engines are verifying network boundaries, TLS integrity, and sandboxed bridge capabilities.</blockquote>
        `.trim();

        buttons.push([{ text: '🔍 View Security Scan', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'VALIDATION_SUCCESS':
      case 'SECURITY_PASSED': {
        const score = metadata?.score ?? 100;
        const text = `
🟢 <b>AUTOMATED VALIDATION VERIFIED</b>

📱 <b>App:</b> ${appDisplayName}
🏆 <b>Score:</b> <b>${score} / 100</b> (Verified)
🛡️ <b>Status:</b> All Security Checks Passed

<pre><code class="language-diff">
+ SAST Analysis  : Passed (0 critical)
+ SSRF Boundary  : Verified Secure
+ API Signature  : Valid
+ Gatekeeper     : Approved
</code></pre>

<blockquote>Security compliance verified. Application has advanced to <b>IN_REVIEW</b> for admin review.</blockquote>
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
              .map((l) => {
                const line = l.trim().replace(/^[-•!+]\s*/, '');
                return `- Issue        : ${line}`;
              })
              .join('\n')
          : '- Issue        : Security compliance gate requirements not satisfied';

        const text = `
🔴 <b>VALIDATION FAILED</b>

📱 <b>App:</b> ${appDisplayName}
⚠️ <b>Score:</b> <b>${score} / 100</b> (Violations Detected)
🛡️ <b>Status:</b> Compliance Gate Failed

<pre><code class="language-diff">
- Compliance   : Policy Violations Detected
${cleanIssue}
! Action       : Fix issues & re-submit
</code></pre>

<blockquote>Please address identified security policy violations in the portal and re-submit.</blockquote>
        `.trim();

        buttons.push([
          { text: '🛠️ Remediate Violations', url: detailsUrl },
          { text: '📋 View Full Report', url: detailsUrl },
        ]);
        return { text, buttons };
      }

      case 'MINIAPP_APPROVED': {
        const text = `
🟢 <b>MINI APP APPROVED</b>

📱 <b>App:</b> ${appDisplayName}
👤 <b>Reviewer:</b> SuperApp Administrator
🏢 <b>Status:</b> <b>APPROVED</b>

<pre><code class="language-diff">
+ Decision     : Approved for SuperApp
+ Pipeline     : Queued for assembly & packaging
+ Access       : Manifest capabilities enabled
</code></pre>

<blockquote>MiniApp <b>"${appDisplayName}"</b> has been formally approved and scheduled for test build assembly.</blockquote>
        `.trim();

        buttons.push([{ text: '🔍 View MiniApp Details', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'BUILD_STARTED':
      case 'BUILDING': {
        const version =
          (metadata?.version as string) ||
          (metadata?.releaseVersion as string) ||
          'v1.0.0';
        const text = `
🔵 <b>SUPER APP BUILD IN PROGRESS</b>

📱 <b>App:</b> ${appDisplayName}
🏷️ <b>Version:</b> <code>${version}</code>
⚙️ <b>Pipeline:</b> Jenkins Sandbox & APK Assembler

<pre><code class="language-diff">
! Flutter Engine : Compiling Native Core
! Dependencies   : Resolving packages
! Artifacts      : Generating Android APK & Web Sandbox
</code></pre>

<blockquote>Stand by while binary artifacts are assembled and published to Sonatype Nexus.</blockquote>
        `.trim();

        buttons.push([{ text: '📊 View Build Progress', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'TEST_BUILD_READY': {
        const rawVer =
          (metadata?.version as string) ||
          (metadata?.releaseVersion as string) ||
          'v0.2.1';
        const version = rawVer.startsWith('v') ? rawVer : `v${rawVer}`;
        const targetFilename = `superapp-test-${version}.apk`;
        const apkUrl = `${baseUrl}/api/download-apk?type=test&version=${encodeURIComponent(version)}&appName=superapp`;
        const sandboxUrl = miniAppId
          ? `${baseUrl}/miniapps/${miniAppId}?preview=true`
          : `${baseUrl}/preview`;

        const text = `
🟢 <b>SUPER APP TEST BUILD READY</b>

📱 <b>App:</b> ${appDisplayName}
🏷️ <b>Version:</b> <code>${version}</code>
📦 <b>Artifact:</b> <code>${targetFilename}</code>

<pre><code class="language-diff">
+ Test APK     : ${targetFilename}
+ Web Sandbox  : Live & Interactive
+ Release Tag  : ${version}
</code></pre>

<blockquote>SuperApp test binary packaging is complete! You can download the test APK or launch the interactive Web Sandbox.</blockquote>
        `.trim();

        const actionRow: TelegramInlineButton[] = [];
        if (apkUrl) {
          actionRow.push({ text: `📲 Download ${targetFilename}`, url: apkUrl });
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
              .map((l) => `- Error        : ${l.trim().replace(/^[-•!+]\s*/, '')}`)
              .join('\n')
          : '- Error        : Fastlane packaging or Nexus publish failed';

        const text = `
🔴 <b>SUPER APP BUILD ERROR</b>

📱 <b>App:</b> ${appDisplayName}
🏷️ <b>Version:</b> <code>${version}</code>
⚙️ <b>Pipeline:</b> Jenkins Assembler CI

<pre><code class="language-diff">
- Pipeline     : Build & Assembly Failed
${cleanReason}
! Action       : Check CI logs & retry
</code></pre>

<blockquote>The SuperApp build packaging failed. Please check the build logs in the portal to diagnose.</blockquote>
        `.trim();

        buttons.push([{ text: '🛠️ View Build Logs', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'CHANGES_REQUESTED': {
        const cleanFeedback = message
          ? message
              .split('\n')
              .filter(Boolean)
              .map((l) => `! Note         : ${l.trim().replace(/^[-•!+]\s*/, '')}`)
              .join('\n')
          : '! Note         : Revisions requested before approval';

        const text = `
🟡 <b>CHANGES REQUESTED</b>

📱 <b>App:</b> ${appDisplayName}
👤 <b>Reviewer:</b> SuperApp Administrator
📝 <b>Feedback:</b> ${message}

<pre><code class="language-diff">
! Decision     : Changes Requested
${cleanFeedback}
! Action       : Update & submit new revision
</code></pre>

<blockquote>Please review the requested changes in the Backoffice Portal and submit an updated revision.</blockquote>
        `.trim();

        buttons.push([{ text: '✏️ Update MiniApp', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'MINIAPP_REJECTED': {
        const cleanReason = message
          ? message
              .split('\n')
              .filter(Boolean)
              .map((l) => `- Reason       : ${l.trim().replace(/^[-•!+]\s*/, '')}`)
              .join('\n')
          : '- Reason       : Submission does not meet integration policies';

        const text = `
🔴 <b>MINI APP REJECTED</b>

📱 <b>App:</b> ${appDisplayName}
👤 <b>Decision:</b> Not Approved
📝 <b>Reason:</b> ${message}

<pre><code class="language-diff">
- Decision     : Submission Rejected
${cleanReason}
</code></pre>

<blockquote>The submission for "${appDisplayName}" did not meet the required integration or compliance policies.</blockquote>
        `.trim();

        buttons.push([{ text: '🔍 View Decision in Portal', url: detailsUrl }]);
        return { text, buttons };
      }

      case 'REVISION_SUBMITTED': {
        const text = `
🟣 <b>NEW REVISION INGESTED</b>

📱 <b>App:</b> ${appDisplayName}
📝 <b>Title:</b> ${title}
📄 <b>Details:</b> ${message}

<pre><code class="language-diff">
! Revision     : New Version Ingested
! Status       : Queued for Security Scan & Review
</code></pre>

<blockquote>A new revision has been submitted for automated security scanning and administrator review.</blockquote>
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

        const detailLines = message
          ? message
              .split('\n')
              .filter(Boolean)
              .map((l) => `${prefix} Detail       : ${l.trim().replace(/^[-•!+]\s*/, '')}`)
              .join('\n')
          : `${prefix} Detail       : Notification update`;

        const text = `
${badge} <b>${header.toUpperCase()}</b>

📱 <b>App:</b> ${appDisplayName}
📝 <b>Title:</b> ${title}

<pre><code class="language-diff">
${detailLines}
</code></pre>

<blockquote>${message || 'SuperApp Gateway notification update.'}</blockquote>
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
        return 'SuperApp Notification';
    }
  }
}
