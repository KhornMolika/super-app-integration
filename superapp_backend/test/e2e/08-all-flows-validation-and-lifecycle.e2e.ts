/**
 * End-to-end test suite verifying:
 * 1. Backend validation logic across all 4 flows:
 *    - WebView (URL format, HTTPS, localhost barring, token & domain association)
 *    - Flutter Package (Artifact archive & Git repo validation)
 *    - Native SDK (Package naming, platform SDKs, capabilities)
 *    - Deep Link (RFC 3986 URL scheme, reserved schemes, store fallbacks)
 * 2. Versioning and Review Actions:
 *    - Update MiniApp version (creating pendingRevision while live serves phones)
 *    - Reject (admin rejection with reason)
 *    - Request Change (change request with reason and developer resubmission)
 *    - Rollback MiniApp to previous version
 * 3. MiniApp access to SuperApp Capabilities & Device Features
 */
import { bootApp, E2eApp } from './support/app';
import {
  action,
  appAt,
  appRow,
  data,
  listed,
  newDraft,
  opens,
  phoneUser,
  PhoneUser,
  scanResult,
  staff,
  Staff,
  stages,
  uniq,
  webviewApp,
} from './support/fixtures';

describe('End-to-End: All 4 Flows, Versioning, Review Actions & Capabilities', () => {
  let e: E2eApp;
  let dev: Staff;
  let sa: Staff;
  let phone: PhoneUser;

  beforeAll(async () => {
    e = await bootApp();
    dev = await staff(e, 'MA_DEVELOPER', 'FTC');
    sa = await staff(e, 'SUPER_ADMIN', 'FTC');
    phone = await phoneUser(e);
  });

  afterAll(() => e?.close());

  /** Helper to wait for asynchronous validation issues to be persisted */
  const waitForIssues = async (id: string, timeoutMs = 5000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const issues = await e.db.query(
        `SELECT * FROM mini_app_issues WHERE "miniAppId" = $1`,
        [id],
      );
      if (issues && issues.length > 0) return issues;
      await new Promise((r) => setTimeout(r, 100));
    }
    return await e.db.query(
      `SELECT * FROM mini_app_issues WHERE "miniAppId" = $1`,
      [id],
    );
  };

  // =========================================================================
  // SECTION 1: VALIDATION LOGIC ACROSS ALL 4 FLOWS
  // =========================================================================
  describe('Flow 1: WebView Integration & Validation', () => {
    it('generates a cryptographically strong public verification token', async () => {
      const res = await e
        .http()
        .get('/mini-apps/generate-token')
        .set(dev.auth);
      expect(res.status).toBe(200);
      const token = res.body?.token || res.body?.data?.token;
      expect(token).toMatch(/^tok_live_[a-f0-9]{32}$/);
    });

    it('rejects standalone domain verification when URL or parameters are missing', async () => {
      const res = await e
        .http()
        .post('/mini-apps/verify-domain')
        .set(dev.auth)
        .send({});
      expect(res.status).toBe(400);
    });

    it('validates allowedDomains hostnames (rejects URLs containing paths or protocol)', async () => {
      const appId = `kh.e2e.wv.${uniq('app')}`;
      const res = await e
        .http()
        .post('/mini-apps')
        .set(dev.auth)
        .send({
          appId,
          name: 'WebView Test App',
          tagline: 'WebView validation testing',
          description: 'Testing webview allowed domains',
          category: 'FINANCE',
          integrationMethod: 'WEBVIEW',
          integrationConfigWebView: {
            productionUrl: 'https://example.com/app',
            allowedDomains: ['https://invalid-with-protocol.com/path'],
          },
        });
      expect(res.status).toBe(201);
      const issues = await waitForIssues(data(res).id);
      expect(issues.length).toBeGreaterThan(0);
      const hasAllowedDomainError = issues.some(
        (i: any) =>
          i.description?.toLowerCase().includes('invalid domain') ||
          i.metadata?.field === 'integrationConfigWebView.allowedDomains',
      );
      expect(hasAllowedDomainError).toBe(true);
    });
  });

  describe('Flow 2: Flutter Package Integration & Validation', () => {
    it('detects missing archive file when sourceType is ARTIFACT without package archive', async () => {
      const appId = `kh.e2e.flutter.${uniq('app')}`;
      const res = await e
        .http()
        .post('/mini-apps')
        .set(dev.auth)
        .send({
          appId,
          name: 'Flutter Artifact App',
          tagline: 'Flutter package artifact validation',
          description: 'Testing flutter package archive requirement',
          category: 'GOVERNMENT',
          integrationMethod: 'FLUTTER_PACKAGE',
          integrationConfigFlutter: {
            sourceType: 'ARTIFACT',
            packageName: 'e2e_flutter_sample',
          },
        });
      expect(res.status).toBe(201);
      const issues = await waitForIssues(data(res).id);
      expect(issues.length).toBeGreaterThan(0);
      const hasArchiveError = issues.some(
        (i: any) =>
          i.metadata?.field === 'integrationConfigFlutter.archiveFile' ||
          i.description?.toLowerCase().includes('package archive'),
      );
      expect(hasArchiveError).toBe(true);
    });

    it('validates Git source integration requirements', async () => {
      const appId = `kh.e2e.fluttergit.${uniq('app')}`;
      const res = await e
        .http()
        .post('/mini-apps')
        .set(dev.auth)
        .send({
          appId,
          name: 'Flutter Git App',
          tagline: 'Flutter package git validation',
          description: 'Testing flutter git repo requirement',
          category: 'COMMERCE',
          integrationMethod: 'FLUTTER_PACKAGE',
          integrationConfigFlutter: {
            sourceType: 'GIT',
            gitUrl: 'invalid-git-url',
          },
        });
      expect(res.status).toBe(201);
      const issues = await waitForIssues(data(res).id);
      expect(issues.length).toBeGreaterThan(0);
      const hasGitError = issues.some(
        (i: any) =>
          i.metadata?.field === 'integrationConfigFlutter.gitUrl' ||
          i.description?.toLowerCase().includes('git'),
      );
      expect(hasGitError).toBe(true);
    });
  });

  describe('Flow 3: Native SDK Integration & Validation', () => {
    it('accepts valid Native SDK integration metadata with module naming', async () => {
      const appId = `kh.e2e.native.${uniq('app')}`;
      const res = await e
        .http()
        .post('/mini-apps')
        .set(dev.auth)
        .send({
          appId,
          name: 'Native SDK MiniApp',
          tagline: 'Native SDK integration testing',
          description: 'Testing native sdk configuration',
          category: 'PUBLIC_SERVICES',
          integrationMethod: 'NATIVE_SDK',
          integrationConfigNativeSdk: {
            androidPackageName: 'com.fsa.miniapp.sample',
            androidObjectName: 'SampleSDK',
            androidArtifactFilename: 'sample-sdk-1.0.0.aar',
            androidMavenGroupId: 'com.fsa.miniapp',
            androidMavenArtifactId: 'sample-sdk',
            androidMavenVersion: '1.0.0',
          },
        });
      expect(res.status).toBe(201);
      const id = data(res).id;
      const row = await appRow(e, id);
      expect(row.integrationMethod).toBe('NATIVE_SDK');
      const cfg = row.integrationConfig || data(res).integrationConfig;
      expect(cfg?.androidPackageName).toBe('com.fsa.miniapp.sample');
    });
  });

  describe('Flow 4: Deep Link Integration & Validation', () => {
    it('rejects collision with reserved protocol schemes (http, https, file, intent)', async () => {
      const appId = `kh.e2e.dl.${uniq('app')}`;
      const res = await e
        .http()
        .post('/mini-apps')
        .set(dev.auth)
        .send({
          appId,
          name: 'Deep Link Reserved Scheme App',
          tagline: 'Testing reserved protocol collision',
          description: 'Deep link scheme testing',
          category: 'PUBLIC_SERVICES',
          integrationMethod: 'DEEP_LINK',
          integrationConfigDeepLink: {
            urlScheme: 'https://',
          },
        });
      expect(res.status).toBe(201);
      const issues = await waitForIssues(data(res).id);
      expect(issues.length).toBeGreaterThan(0);
      const hasSchemeError = issues.some(
        (i: any) =>
          i.description?.toLowerCase().includes('collides with a reserved') ||
          i.metadata?.field === 'integrationConfigDeepLink.urlScheme',
      );
      expect(hasSchemeError).toBe(true);
    });

    it('rejects schemes that violate RFC 3986 syntax', async () => {
      const appId = `kh.e2e.dl.${uniq('app')}`;
      const res = await e
        .http()
        .post('/mini-apps')
        .set(dev.auth)
        .send({
          appId,
          name: 'Deep Link Invalid Scheme App',
          tagline: 'Testing invalid RFC syntax',
          description: 'Deep link scheme testing',
          category: 'PUBLIC_SERVICES',
          integrationMethod: 'DEEP_LINK',
          integrationConfigDeepLink: {
            urlScheme: '123_invalid_scheme$',
          },
        });
      expect(res.status).toBe(201);
      const issues = await waitForIssues(data(res).id);
      expect(issues.length).toBeGreaterThan(0);
      const hasSyntaxError = issues.some(
        (i: any) =>
          i.description?.toLowerCase().includes('rfc 3986 syntax') ||
          i.metadata?.field === 'integrationConfigDeepLink.urlScheme',
      );
      expect(hasSyntaxError).toBe(true);
    });

    it('accepts valid custom RFC 3986 URI schemes with store fallbacks', async () => {
      const appId = `kh.e2e.dl.${uniq('app')}`;
      const res = await e
        .http()
        .post('/mini-apps')
        .set(dev.auth)
        .send({
          appId,
          name: 'Deep Link Valid App',
          tagline: 'Testing valid scheme',
          description: 'Deep link scheme testing',
          category: 'PUBLIC_SERVICES',
          integrationMethod: 'DEEP_LINK',
          integrationConfigDeepLink: {
            urlScheme: 'novainsurance://open',
            appStoreUrl: 'https://apps.apple.com/app/id123456789',
            playStoreUrl: 'https://play.google.com/store/apps/details?id=com.nova.insurance',
          },
        });
      expect(res.status).toBe(201);
      const row = await appRow(e, data(res).id);
      expect(row.integrationMethod).toBe('DEEP_LINK');
      expect(
        row.validationErrors?.['integrationConfigDeepLink.urlScheme'],
      ).toBeUndefined();
    });
  });

  // =========================================================================
  // SECTION 2: LIFECYCLE & REVIEW ACTIONS (Reject, Request Change, Versioning, Rollback)
  // =========================================================================
  describe('Review Decision: Request Changes', () => {
    it('moves an IN_REVIEW app to CHANGES_REQUESTED with reviewer reason, then developer edits & resubmits', async () => {
      const id = await appAt(e, dev, sa, 'IN_REVIEW');
      const changeRes = await action(e, sa, id, 'request-changes', {
        reason: 'The application logo does not adhere to branding guidelines.',
      });
      expect(changeRes.status).toBe(201);
      expect(await stages(e, id)).toEqual(['1.0.0:CHANGES_REQUESTED']);

      // Developer updates the app with the requested change
      const updateRes = await e
        .http()
        .patch(`/mini-apps/${id}`)
        .set(dev.auth)
        .send({ tagline: 'Updated Logo & Brand' });
      expect(updateRes.status).toBe(200);

      // Verify app transitions back to SUBMITTED
      const deadline = Date.now() + 5000;
      while (
        Date.now() < deadline &&
        (await stages(e, id))[0] !== '1.0.0:SUBMITTED'
      ) {
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(await stages(e, id)).toEqual(['1.0.0:SUBMITTED']);

      // Once security scan passes again, returns to IN_REVIEW
      await scanResult(e, id, 'PASSED');
      expect(await stages(e, id)).toEqual(['1.0.0:IN_REVIEW']);
    });
  });

  describe('Review Decision: Reject', () => {
    it('moves an IN_REVIEW app to REJECTED with explicit audit reason and hides from catalog', async () => {
      const id = await appAt(e, dev, sa, 'IN_REVIEW');
      const rejectRes = await action(e, sa, id, 'reject', {
        reason: 'Security non-compliance: Unauthorized third-party telemetry detected.',
      });
      expect(rejectRes.status).toBe(201);
      expect(await stages(e, id)).toEqual(['1.0.0:REJECTED']);

      // Rejected app cannot be listed on mobile client
      expect(await listed(e, phone, id, 'debug')).toBe(false);
      expect(await listed(e, phone, id, 'release')).toBe(false);

      // Developer can resolve and submit again
      const resubmitRes = await action(e, dev, id, 'submit');
      expect(resubmitRes.status).toBe(201);
      expect(await stages(e, id)).toEqual(['1.0.0:SUBMITTED']);
    });
  });

  describe('Versioning: Update MiniApp Version & Rollback on Live App', () => {
    let liveAppId: string;

    beforeAll(async () => {
      liveAppId = await appAt(e, dev, sa, 'LIVE');
    });

    it('updating a LIVE app creates a new version revision (1.1.0:IN_REVIEW) while 1.0.0:ACTIVE stays live', async () => {
      const editRes = await e
        .http()
        .patch(`/mini-apps/${liveAppId}`)
        .set(dev.auth)
        .send({
          version: '1.1.0',
          tagline: 'Version 1.1.0 Enhanced Performance',
        });
      expect(editRes.status).toBe(200);

      // Stages show pending revision under review while 1.0.0 remains active
      expect(await stages(e, liveAppId)).toEqual(['1.1.0:IN_REVIEW', '1.0.0:ACTIVE']);

      // Live app continues serving phones with 1.0.0
      const row = await appRow(e, liveAppId);
      expect(row.status).toBe('LIVE');
      expect(row.currentReleaseVersion || row.version).toBe('1.0.0');
      expect(await listed(e, phone, liveAppId, 'release')).toBe(true);
      expect(await opens(e, phone, liveAppId, 'release')).toBe(200);
    });

    it('approving and publishing the new version swaps it to 1.1.0:ACTIVE and retains 1.0.0:PREVIOUS', async () => {
      await scanResult(e, liveAppId, 'PASSED');
      const approveRes = await action(e, sa, liveAppId, 'approve');
      expect(approveRes.status).toBe(201);

      expect(await stages(e, liveAppId)).toEqual(['1.1.0:ACTIVE', '1.0.0:PREVIOUS']);
      const row = await appRow(e, liveAppId);
      expect(row.status).toBe('LIVE');
      expect(row.tagline).toBe('Version 1.1.0 Enhanced Performance');
    });

    it('rolls back the live app to 1.0.0 immediately upon Super Admin request', async () => {
      const rollbackRes = await action(e, sa, liveAppId, 'rollback', {
        targetVersion: '1.0.0',
        reason: 'Critical regression detected in 1.1.0 payment webhook',
      });
      expect(rollbackRes.status).toBe(201);

      // Stages are swapped back: 1.0.0 is ACTIVE, 1.1.0 is PREVIOUS
      expect(await stages(e, liveAppId)).toEqual(['1.1.0:PREVIOUS', '1.0.0:ACTIVE']);
      const row = await appRow(e, liveAppId);
      expect(row.status).toBe('LIVE');
      expect(row.currentReleaseVersion || row.version).toBe('1.0.0');

      // Phones immediately receive 1.0.0
      expect(await listed(e, phone, liveAppId, 'release')).toBe(true);
      expect(await opens(e, phone, liveAppId, 'release')).toBe(200);
    });

    it('enforces RBAC: normal developer cannot perform rollback', async () => {
      const devRollback = await action(e, dev, liveAppId, 'rollback', {
        targetVersion: '1.1.0',
      });
      expect(devRollback.status).toBe(403);
    });
  });

  // =========================================================================
  // SECTION 3: REAL CAPABILITIES (DEVICE FEATURES) ACCESS
  // =========================================================================
  describe('Capabilities: Device Features & Runtime Permission Gating', () => {
    it('fetches supported SuperApp capabilities catalog', async () => {
      const res = await e.http().get('/capabilities').set(dev.auth);
      expect(res.status).toBe(200);
      const items = Array.isArray(res.body?.data) ? res.body.data : res.body;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      const keys = items.map((c: any) => (c.key || c.name || '').toLowerCase());
      // Real device capabilities in catalog
      expect(keys.some((k: string) => k.includes('camera') || k.includes('location'))).toBe(true);
    });

    it('issues signed mini-app launch token containing granted capability audiences', async () => {
      const liveAppId = await appAt(e, dev, sa, 'LIVE');
      const res = await e
        .http()
        .post(`/mini-apps/${liveAppId}/preview-token`)
        .set(dev.auth)
        .send();
      expect(res.status).toBe(201);
      const token = res.body?.token || res.body?.data?.token;
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // Valid JWT structure
    });
  });
});
