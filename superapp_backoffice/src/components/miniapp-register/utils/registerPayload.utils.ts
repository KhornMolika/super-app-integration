import { IntegrationMethod, SourceType, CreateMiniAppDto } from '@/types/miniapp.types';
import { miniappsApi } from '@/api';
import { sdkArtifactsApi } from '@/api/sdk-artifacts.api';
import { nativeSdkShipsAndroid, nativeSdkShipsIos } from '@/lib/miniapp-form.validator';

/** Native SDK files chosen in the form; they stay in the browser until submit. */
export interface PendingSdkFiles {
  ios?: File | null;
  android?: File | null;
}

const IOS_KEYS = [
  'iosModuleName', 'iosTypeName', 'iosArtifactFilename', 'iosMinioKey', 'iosMinioUrl', 'iosSha256',
  'iosStoragePath', 'iosChecksum', 'iosSize', 'iosVersion', 'iosDetectedPermissions',
];
const ANDROID_KEYS = [
  'androidPackageName', 'androidObjectName', 'androidArtifactFilename', 'androidMinioKey', 'androidMinioUrl',
  'androidSha256', 'androidStoragePath', 'androidChecksum', 'androidSize', 'androidMinSdkVersion',
  'androidDetectedPermissions', 'androidMavenGroupId', 'androidMavenArtifactId', 'androidMavenVersion',
];

/**
 * Drops the fields of a platform the SDK does not ship. The form auto-fills
 * names for both platforms; only the chosen files say which ones ship.
 */
function keepShippedNativePlatforms(payload: Partial<CreateMiniAppDto>, files: PendingSdkFiles) {
  const conf: Record<string, unknown> | undefined = payload.integrationConfigNativeSdk as any;
  if (!conf) return;
  const next = { ...conf };
  if (!nativeSdkShipsIos(conf, files.ios)) IOS_KEYS.forEach((k) => delete next[k]);
  if (!nativeSdkShipsAndroid(conf, files.android)) ANDROID_KEYS.forEach((k) => delete next[k]);
  payload.integrationConfigNativeSdk = next as any;
}

/**
 * Sends the chosen SDK files to MinIO quarantine, now that the mini app
 * exists. The server records them on the mini app; they reach Nexus only
 * when it is approved. Returns the platforms that failed.
 */
export async function uploadPendingSdkFiles(
  miniAppId: string,
  files: PendingSdkFiles,
  conf?: Record<string, any>,
): Promise<string[]> {
  const failed: string[] = [];
  const send = async (platform: 'iOS' | 'Android', file: File, call: (fd: FormData) => Promise<unknown>) => {
    const fd = new FormData();
    fd.append('file', file);
    const version = platform === 'iOS' ? conf?.iosVersion : conf?.androidMavenVersion;
    if (version) fd.append('version', String(version));
    if (platform === 'Android' && conf?.androidMavenGroupId) fd.append('groupId', String(conf.androidMavenGroupId));
    try {
      await call(fd);
    } catch (err) {
      console.error(`Uploading the ${platform} SDK failed:`, err);
      failed.push(platform);
    }
  };
  if (files.ios) await send('iOS', files.ios, (fd) => sdkArtifactsApi.uploadIos(miniAppId, fd));
  if (files.android) await send('Android', files.android, (fd) => sdkArtifactsApi.uploadAndroid(miniAppId, fd));
  return failed;
}

export async function prepareDraftPayload(
  formData: Partial<CreateMiniAppDto>,
  pendingArchiveFile: File | null,
  sdkFiles: PendingSdkFiles = {},
): Promise<Partial<CreateMiniAppDto>> {
  const payload = { ...formData, homeWidget: formData.homeWidget ?? null };
  if (payload.integrationMethod !== IntegrationMethod.WEBVIEW) {
    delete payload.integrationConfigWebView;
  }
  if (payload.integrationMethod !== IntegrationMethod.NATIVE_SDK) {
    delete payload.integrationConfigNativeSdk;
  } else {
    keepShippedNativePlatforms(payload, sdkFiles);
  }
  if (payload.integrationMethod !== IntegrationMethod.FLUTTER_PACKAGE) {
    delete payload.integrationConfigFlutter;
  } else if (pendingArchiveFile && payload.integrationConfigFlutter?.sourceType !== SourceType.GIT) {
    // (a Git source never uploads an archive picked before switching to Git)
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', pendingArchiveFile);
      if (payload.appId) uploadFormData.append('miniAppId', payload.appId);
      const ver =
        payload.integrationConfigFlutter?.versionConstraint?.replace(/^[\^~>=<]+/, '') || '1.0.0';
      uploadFormData.append('version', ver);

      const uploadRes = await miniappsApi.uploadArtifact(uploadFormData);
      if (
        // A stored path, not just success: without it the submit has no archive
        uploadRes &&
        (uploadRes.packageStoragePath ||
          uploadRes.minioKey ||
          uploadRes.packageUrl)
      ) {
        payload.integrationConfigFlutter = {
          sourceType: payload.integrationConfigFlutter?.sourceType || SourceType.ARTIFACT,
          ...payload.integrationConfigFlutter,
          packageStoragePath:
            uploadRes.packageStoragePath || uploadRes.minioKey || uploadRes.packageUrl,
          packageUrl: uploadRes.packageUrl,
          archiveChecksum: uploadRes.sha256 || payload.integrationConfigFlutter?.archiveChecksum,
        };
      }
    } catch (err) {
      console.error('Failed to upload archive to MinIO on draft save:', err);
    }
  }

  return payload;
}

/** The package archive could not be stored in MinIO, so the mini app was not submitted. */
export class ArchiveUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchiveUploadError';
  }
}

export async function prepareSubmitPayload(
  formData: Partial<CreateMiniAppDto>,
  pendingArchiveFile: File | null,
  sdkFiles: PendingSdkFiles = {},
): Promise<Partial<CreateMiniAppDto>> {
  const payload = { ...formData, homeWidget: formData.homeWidget ?? null };

  if (payload.integrationMethod !== IntegrationMethod.WEBVIEW) {
    delete payload.integrationConfigWebView;
  } else if (payload.integrationConfigWebView) {
    const webConfig = { ...payload.integrationConfigWebView };
    if (typeof webConfig.allowedDomains === 'string') {
      webConfig.allowedDomains = (webConfig.allowedDomains as any)
        .split(',')
        .map((d: string) => d.trim())
        .filter(Boolean);
    }
    payload.integrationConfigWebView = webConfig;
  }

  if (payload.integrationMethod !== IntegrationMethod.FLUTTER_PACKAGE) {
    delete payload.integrationConfigFlutter;
  } else if (pendingArchiveFile && payload.integrationConfigFlutter?.sourceType !== SourceType.GIT) {
    // (a Git source never uploads an archive picked before switching to Git)
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', pendingArchiveFile);
      if (payload.appId) uploadFormData.append('miniAppId', payload.appId);
      const ver =
        payload.integrationConfigFlutter?.versionConstraint?.replace(/^[\^~>=<]+/, '') || '1.0.0';
      uploadFormData.append('version', ver);

      const uploadRes = await miniappsApi.uploadArtifact(uploadFormData);
      if (
        // A stored path, not just success: without it the submit has no archive
        uploadRes &&
        (uploadRes.packageStoragePath ||
          uploadRes.minioKey ||
          uploadRes.packageUrl)
      ) {
        payload.integrationConfigFlutter = {
          sourceType: payload.integrationConfigFlutter?.sourceType || SourceType.ARTIFACT,
          ...payload.integrationConfigFlutter,
          packageStoragePath:
            uploadRes.packageStoragePath || uploadRes.minioKey || uploadRes.packageUrl,
          packageUrl: uploadRes.packageUrl,
          archiveChecksum: uploadRes.sha256 || payload.integrationConfigFlutter?.archiveChecksum,
        };
      } else {
        throw new Error('the server did not return where the archive was stored');
      }
    } catch (err) {
      // Never submit without the archive: the review would then look for the package in
      // Nexus and fail with "not found", although the developer did attach it.
      console.error('Failed to upload archive to MinIO on submit:', err);
      const reason = err instanceof Error && err.message ? `: ${err.message}` : '';
      throw new ArchiveUploadError(`The package archive could not be uploaded${reason}. Please try submitting again.`);
    }
  }

  if (payload.integrationMethod !== IntegrationMethod.NATIVE_SDK) {
    delete payload.integrationConfigNativeSdk;
  } else {
    keepShippedNativePlatforms(payload, sdkFiles);
  }
  if (payload.integrationMethod !== IntegrationMethod.DEEP_LINK) {
    delete payload.integrationConfigDeepLink;
  }

  return payload;
}

export function extractValidationErrors(appData: any): Record<string, string> {
  const displayErrors: Record<string, string> = { ...(appData.validationErrors || {}) };

  if (appData.validationReport?.findings?.length > 0) {
    appData.validationReport.findings.forEach((finding: any) => {
      const key = finding.title || finding.id || 'Security Finding';
      displayErrors[key] = `${finding.description}${
        finding.recommendation ? ' (Remediation: ' + finding.recommendation + ')' : ''
      }`;
    });
  }

  if (Array.isArray(appData.issues) && appData.issues.length > 0) {
    appData.issues.forEach((iss: any, idx: number) => {
      const key = iss.title || iss.classification || `Security Finding #${idx + 1}`;
      if (!Object.values(displayErrors).some((val) => val.includes(iss.description))) {
        displayErrors[key] = iss.description;
      }
    });
  }

  if (appData.validationStages) {
    Object.values(appData.validationStages).forEach((st: any) => {
      if (st.status === 'FAILED') {
        const stageName = st.name || st.id || 'Validation Stage';
        if (!displayErrors[stageName]) {
          displayErrors[stageName] = st.details || 'Failed automated security check.';
        }
      }
    });
  }

  if (Object.keys(displayErrors).length === 0) {
    displayErrors['Security Validation'] =
      'Automated security scan failed on this endpoint. Please verify your URLs and TLS configuration.';
  }

  return displayErrors;
}
