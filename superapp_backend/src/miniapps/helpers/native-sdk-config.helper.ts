/**
 * Keys of a NATIVE_SDK integrationConfig that are written only by the server
 * (SDK artifact upload service, native-sdk codegen on approval). They are not
 * part of NativeSdkConfigDto and must never be settable by a client, nor be
 * wiped when a client saves the user-editable fields.
 */
export const NATIVE_SDK_SERVER_MANAGED_KEYS = [
  'iosMinioKey',
  'iosMinioUrl',
  'androidMinioKey',
  'androidMinioUrl',
  'iosNexusZipUrl',
  'androidNexusMavenUrl',
  'codegenPrUrl', // holds the GitLab merge request URL (name kept to avoid a data migration)
  'codegenChangedFiles',
] as const;

/** Removes server-managed keys from client-supplied config. */
export function stripNativeSdkServerKeys(config: any): any {
  if (!config || typeof config !== 'object') return config;
  const copy = { ...config };
  for (const k of NATIVE_SDK_SERVER_MANAGED_KEYS) delete copy[k];
  return copy;
}

/**
 * Merges a client-supplied NATIVE_SDK config over the existing one: client
 * (DTO) keys win, server-managed keys always come from the existing config.
 */
export function mergeNativeSdkConfig(existing: any, incoming: any): any {
  const base = existing && typeof existing === 'object' ? existing : {};
  const merged: any = { ...base, ...stripNativeSdkServerKeys(incoming) };
  for (const k of NATIVE_SDK_SERVER_MANAGED_KEYS) {
    if (base[k] !== undefined) merged[k] = base[k];
    else delete merged[k];
  }
  return merged;
}

/** All client-editable NATIVE_SDK config keys (mirrors NativeSdkConfigDto). */
export const NATIVE_SDK_CLIENT_KEYS = [
  'iosModuleName',
  'iosTypeName',
  'iosArtifactFilename',
  'androidPackageName',
  'androidObjectName',
  'androidArtifactFilename',
  'androidMavenGroupId',
  'androidMavenArtifactId',
  'androidMavenVersion',
] as const;

/** Project-scoped GitLab merge request number (iid) from a `.../merge_requests/<n>` URL. */
export function parseMergeRequestIid(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const m = url.match(/\/merge_requests\/(\d{1,9})(?:[/?#]|$)/);
  return m ? m[1] : undefined;
}

/**
 * The newest codegen MR referenced by the given integration configs (highest
 * iid), or undefined when none has one. Used to tag Jenkins builds.
 */
export function latestCodegenMrIid(configs: unknown[]): string | undefined {
  let best: number | undefined;
  for (const c of configs) {
    const iid = parseMergeRequestIid((c as any)?.codegenPrUrl);
    if (iid !== undefined && (best === undefined || Number(iid) > best)) {
      best = Number(iid);
    }
  }
  return best === undefined ? undefined : String(best);
}
