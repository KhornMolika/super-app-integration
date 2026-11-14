/**
 * The shape of mini_app_versions.integrationConfig for each integrationMethod.
 *
 * integrationMethod says what kind of mini app it is; integrationConfig holds
 * that kind's settings. The fields the developer sends match the DTOs in
 * dto/create-miniapp.dto.ts; the rest are written by the server (Git pinning,
 * Nexus publishing, scan bookkeeping, and leftovers folded in from the old
 * mini_app_versions columns).
 *
 * MiniApp.integrationConfig and MiniAppVersion.integrationConfig are typed as
 * IntegrationConfig (every method's fields, plus unknown keys) because a
 * loaded app is not narrowed by its method. Code that handles one method
 * should take the narrow type with integrationConfigFor():
 *
 *   const flutter = integrationConfigFor(app, 'FLUTTER_PACKAGE');
 *   if (flutter) flutter.gitUrl;   // typed; a typo is a compile error
 *
 * No imports: the entities use these types.
 */

export const INTEGRATION_METHODS = ['WEBVIEW', 'FLUTTER_PACKAGE', 'NATIVE_SDK', 'DEEP_LINK'] as const;
export type IntegrationMethod = (typeof INTEGRATION_METHODS)[number];

/** Written by the server on any method (folded legacy columns, build and scan bookkeeping). */
export interface ServerIntegrationFields {
  /** Old mini_app_versions columns, folded in by SlimMiniAppsAndVersions. */
  gitRef?: string;
  saVersion?: string;
  artifactUrl?: string;
  apkSize?: string;
  buildNumber?: number;
  jenkinsJobUrl?: string;
  /** The Super App test build this version is in. */
  superAppTestVersion?: string;
  /** Nexus publishing state (Flutter package archive, Native SDK). */
  nexusPublishedPackage?: string;
  nexusPublishedVersion?: string;
  nexusPublishedAt?: string;
  nexusPublishCheckedAt?: string;
  nexusPublishError?: string | null;
}

export interface WebViewIntegrationConfig extends ServerIntegrationFields {
  productionUrl?: string;
  stagingUrl?: string;
  allowedDomains?: string[];
  bridgeApiVersion?: string;
  /** Domain verification: stored here, never sent to phones. */
  verificationToken?: string | null;
  isDomainVerified?: boolean;
  domainVerifiedAt?: string | null;
}

export interface FlutterPackageIntegrationConfig extends ServerIntegrationFields {
  /**
   * GIT: built from a repository; ARTIFACT: an uploaded package archive;
   * LOCAL: a package in this monorepo (development only, with `path`).
   */
  sourceType?: 'GIT' | 'ARTIFACT' | 'LOCAL';
  path?: string;
  packageName?: string;
  versionConstraint?: string;

  gitUrl?: string;
  gitPath?: string;
  gitBranch?: string;
  /** A release tag, when the commit was picked by tag. */
  gitTag?: string;
  /** The exact commit that is scanned and built (40 hex). */
  commitSha?: string;
  isPrivateRepo?: boolean;
  authMethod?: 'none' | 'deploy_key' | 'token';
  /** Encrypted at rest; masked in responses. */
  deployKey?: string;
  deployKeyTitle?: string;
  deployPublicKey?: string;
  deployKeyFingerprint?: string;
  /** Legacy access token (encrypted); new apps use a deploy key. */
  gitAccessToken?: string;
  hasDeployKey?: boolean;
  hasGitAccessToken?: boolean;

  /** MinIO key of the uploaded archive; null after a malware purge. */
  packageStoragePath?: string | null;
  packageStorageKey?: string | null;
  packageUrl?: string;
  archiveChecksum?: string;
  archiveFilename?: string;
  archiveSize?: number;
  archiveOriginalSize?: number;
  archiveStrippedFilesCount?: number;
  isSanitized?: boolean;
  isArchiveSubmission?: boolean;
}

export interface NativeSdkIntegrationConfig extends ServerIntegrationFields {
  iosModuleName?: string;
  iosTypeName?: string;
  iosArtifactFilename?: string;
  /** null after a malware purge. */
  iosMinioKey?: string | null;
  iosMinioUrl?: string;
  iosStoragePath?: string;
  iosChecksum?: string;
  iosSize?: number;
  iosVersion?: string;
  iosDetectedPermissions?: string[];
  iosNexusZipUrl?: string;

  androidPackageName?: string;
  androidObjectName?: string;
  androidArtifactFilename?: string;
  /** null after a malware purge. */
  androidMinioKey?: string | null;
  androidMinioUrl?: string;
  androidStoragePath?: string;
  androidChecksum?: string;
  androidSize?: number;
  androidMinSdkVersion?: number;
  androidDetectedPermissions?: string[];
  androidMavenGroupId?: string;
  androidMavenArtifactId?: string;
  androidMavenVersion?: string;
  androidNexusMavenUrl?: string;

  /** Pull request that adds the generated SDK bridge to the Super App. */
  codegenPrUrl?: string;
}

export interface DeepLinkIntegrationConfig extends ServerIntegrationFields {
  urlScheme?: string;
  packageName?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
}

export interface IntegrationConfigByMethod {
  WEBVIEW: WebViewIntegrationConfig;
  FLUTTER_PACKAGE: FlutterPackageIntegrationConfig;
  NATIVE_SDK: NativeSdkIntegrationConfig;
  DEEP_LINK: DeepLinkIntegrationConfig;
}

/**
 * An integrationConfig whose method is not known at compile time: every
 * method's fields, typed, plus keys from older rows.
 */
export type IntegrationConfig = WebViewIntegrationConfig &
  FlutterPackageIntegrationConfig &
  NativeSdkIntegrationConfig &
  DeepLinkIntegrationConfig & { [key: string]: any };

/** "flutter_package", " WEBVIEW " -> the method, or null when it is not one. */
export function normalizeIntegrationMethod(method: unknown): IntegrationMethod | null {
  const m = typeof method === 'string' ? method.trim().toUpperCase() : '';
  return (INTEGRATION_METHODS as readonly string[]).includes(m) ? (m as IntegrationMethod) : null;
}

/**
 * The config, typed for `method`, when the app (or version row) uses that
 * method and has a config; otherwise null.
 */
export function integrationConfigFor<M extends IntegrationMethod>(
  src: { integrationMethod?: string | null; integrationConfig?: Record<string, any> | null } | null | undefined,
  method: M,
): IntegrationConfigByMethod[M] | null {
  if (!src?.integrationConfig || normalizeIntegrationMethod(src.integrationMethod) !== method) return null;
  return src.integrationConfig as IntegrationConfigByMethod[M];
}
