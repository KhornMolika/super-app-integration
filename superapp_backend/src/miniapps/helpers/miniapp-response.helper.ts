import { MiniApp } from '../entities/miniapp.entity';
import { versionRowType } from '../status/version-row-type';

/**
 * Transforms a pure MiniApp entity or plain object into a standardized API response.
 * Safely decorates with backwards-compatible presentation fields (status, shortDescription,
 * organization, versionHistory, permissions, legal terms, etc.) so that external consumers
 * (Backoffice Next.js UI, Mobile Flutter App, and E2E test suites) experience zero breaking changes.
 */
export function formatMiniAppResponse<T = any>(app: T): T {
  if (!app || typeof app !== 'object') {
    return app;
  }

  const a = app as any;

  // Extract versions safely
  const versions =
    Array.isArray(a.versions) && a.versions.length > 0
      ? a.versions.map((v: any) => ({
          version: v.version || '1.0.0',
          // Kept in the response shape; the values now live in integrationConfig
          gitRef: v.integrationConfig?.commitSha || v.integrationConfig?.gitBranch || v.integrationConfig?.gitRef,
          packageName: v.integrationConfig?.packageName,
          sourceType: v.integrationMethod || v.integrationConfig?.sourceType,
          saVersion: v.integrationConfig?.saVersion,
          type: versionRowType(v.status),
          status: v.status || 'DRAFT',
          changelog: v.changelog,
          artifactUrl: v.integrationConfig?.artifactUrl,
          apkSize: v.integrationConfig?.apkSize,
          checksum: v.integrationConfig?.archiveChecksum,
          releasedAt: v.releasedAt
            ? typeof v.releasedAt === 'string'
              ? v.releasedAt
              : v.releasedAt.toISOString()
            : '',
          releasedBy: v.releasedBy,
          buildNumber: v.integrationConfig?.buildNumber,
          jenkinsJobUrl: v.integrationConfig?.jenkinsJobUrl,
          integrationConfig: v.integrationConfig,
          permissions: v.permissions,
        }))
      : Array.isArray(a.versionHistory)
        ? a.versionHistory
        : [];

  const orgName =
    a.organizationRelation?.name ||
    (typeof a.organization === 'string' ? a.organization : undefined);
  const orgCode =
    a.organizationRelation?.code ||
    (typeof a.organizationCode === 'string' ? a.organizationCode : undefined);
  const ownerName =
    a.owner?.name ||
    (typeof a.ownerName === 'string' ? a.ownerName : undefined);
  const ownerEmail =
    a.owner?.email ||
    (typeof a.ownerEmail === 'string' ? a.ownerEmail : undefined);

  // Compute status: prioritize lifecycleStatus, fall back to status
  const resolvedStatus = a.lifecycleStatus || a.status || 'DRAFT';

  return {
    ...a,
    // Legacy presentation accessors
    shortDescription: a.tagline ?? a.shortDescription ?? '',
    fullDescription: a.description ?? a.fullDescription ?? '',
    status: resolvedStatus,
    // Worked out from the app status (getters, not copied by the spread)
    lifecycleStatus: a.lifecycleStatus,
    availabilityStatus: a.availabilityStatus,
    organization: orgName,
    organizationCode: orgCode,
    teamName: orgName || ownerName || a.teamName,
    // Read-only alias the mobile catalog still shows; not stored or accepted.
    category: orgName,
    permissions: a.capabilities || a.permissions || [],
    version: a.currentReleaseVersion || a.version || '1.0.0',
    versionHistory: versions,
    termsUrl: a.legal?.termsUrl ?? a.termsUrl,
    termsDescription: a.legal?.termsDescription ?? a.termsDescription,
    privacyPolicyUrl: a.legal?.privacyPolicyUrl ?? a.privacyPolicyUrl,
    privacyPolicyDescription:
      a.legal?.privacyPolicyDescription ?? a.privacyPolicyDescription,
    teamTelegramChatId: a.alertTelegramChatId ?? a.teamTelegramChatId,
    ownerEmail,
    ownerName,
  } as T;
}
