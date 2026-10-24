import { MiniApp } from '../entities/miniapp.entity';

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
  const versions = Array.isArray(a.versions) && a.versions.length > 0
    ? a.versions.map((v: any) => ({
        version: v.version || '1.0.0',
        gitRef: v.gitRef,
        packageName: v.packageName,
        sourceType: v.sourceType,
        saVersion: v.saVersion,
        type: v.type || 'PRODUCTION',
        status: v.status || 'DRAFT',
        changelog: v.changelog,
        artifactUrl: v.artifactUrl,
        apkSize: v.apkSize,
        checksum: v.checksum,
        releasedAt: v.releasedAt
          ? typeof v.releasedAt === 'string'
            ? v.releasedAt
            : v.releasedAt.toISOString()
          : '',
        releasedBy: v.releasedBy,
        buildNumber: v.buildNumber,
        jenkinsJobUrl: v.jenkinsJobUrl,
        integrationConfig: v.integrationConfig,
        permissions: v.permissions,
      }))
    : Array.isArray(a.versionHistory)
      ? a.versionHistory
      : [];

  const orgName = a.organizationRelation?.name || (typeof a.organization === 'string' ? a.organization : undefined);
  const orgCode = a.organizationRelation?.code || (typeof a.organizationCode === 'string' ? a.organizationCode : undefined);
  const ownerName = a.owner?.name || (typeof a.ownerName === 'string' ? a.ownerName : undefined);
  const ownerEmail = a.owner?.email || (typeof a.ownerEmail === 'string' ? a.ownerEmail : undefined);

  // Compute status: prioritize lifecycleStatus, fall back to status
  const resolvedStatus = a.lifecycleStatus || a.status || 'DRAFT';

  return {
    ...a,
    // Legacy presentation accessors
    shortDescription: a.tagline ?? a.shortDescription ?? '',
    fullDescription: a.description ?? a.fullDescription ?? '',
    status: resolvedStatus,
    organization: orgName,
    organizationCode: orgCode,
    teamName: orgName || ownerName || a.teamName,
    category: orgName || a.category,
    permissions: a.capabilities || a.permissions || [],
    version: a.currentReleaseVersion || a.draftVersion || a.version || '1.0.0',
    versionHistory: versions,
    termsUrl: a.legal?.termsUrl ?? a.termsUrl,
    termsDescription: a.legal?.termsDescription ?? a.termsDescription,
    privacyPolicyUrl: a.legal?.privacyPolicyUrl ?? a.privacyPolicyUrl,
    privacyPolicyDescription: a.legal?.privacyPolicyDescription ?? a.privacyPolicyDescription,
    teamTelegramChatId: a.alertTelegramChatId ?? a.teamTelegramChatId,
    ownerEmail,
    ownerName,
  } as T;
}
