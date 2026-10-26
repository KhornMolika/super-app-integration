import { IntegrationMethod, SourceType, CreateMiniAppDto } from '@/types/miniapp.types';
import { miniappsApi } from '@/api';

export async function prepareDraftPayload(
  formData: Partial<CreateMiniAppDto>,
  pendingArchiveFile: File | null
): Promise<Partial<CreateMiniAppDto>> {
  const payload = { ...formData };
  if (payload.integrationMethod !== IntegrationMethod.WEBVIEW) {
    delete payload.integrationConfigWebView;
  }
  if (payload.integrationMethod !== IntegrationMethod.NATIVE_SDK) {
    delete payload.integrationConfigNativeSdk;
  }
  if (payload.integrationMethod !== IntegrationMethod.FLUTTER_PACKAGE) {
    delete payload.integrationConfigFlutter;
  } else if (pendingArchiveFile) {
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', pendingArchiveFile);
      if (payload.appId) uploadFormData.append('miniAppId', payload.appId);
      const ver =
        payload.integrationConfigFlutter?.versionConstraint?.replace(/^[\^~>=<]+/, '') || '1.0.0';
      uploadFormData.append('version', ver);

      const uploadRes = await miniappsApi.uploadArtifact(uploadFormData);
      if (
        uploadRes &&
        (uploadRes.success ||
          uploadRes.packageStoragePath ||
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

export async function prepareSubmitPayload(
  formData: Partial<CreateMiniAppDto>,
  pendingArchiveFile: File | null
): Promise<Partial<CreateMiniAppDto>> {
  const payload = { ...formData };

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
  } else if (pendingArchiveFile) {
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', pendingArchiveFile);
      if (payload.appId) uploadFormData.append('miniAppId', payload.appId);
      const ver =
        payload.integrationConfigFlutter?.versionConstraint?.replace(/^[\^~>=<]+/, '') || '1.0.0';
      uploadFormData.append('version', ver);

      const uploadRes = await miniappsApi.uploadArtifact(uploadFormData);
      if (
        uploadRes &&
        (uploadRes.success ||
          uploadRes.packageStoragePath ||
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
      console.error('Failed to upload archive to MinIO on submit:', err);
    }
  }

  if (payload.integrationMethod !== IntegrationMethod.NATIVE_SDK) {
    delete payload.integrationConfigNativeSdk;
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
