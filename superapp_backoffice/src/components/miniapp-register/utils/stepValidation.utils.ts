import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';

/**
 * Validates whether all required fields for a specific wizard step are fulfilled.
 */
export function isStepRequiredInfoComplete(
  stepNumber: number,
  formData: Partial<CreateMiniAppDto>,
  pendingArchiveFile?: File | null
): boolean {
  switch (stepNumber) {
    case 1: {
      // 1. MiniApp Name: required, min 2 characters
      const hasName = Boolean(formData.name && formData.name.trim().length >= 2);

      // 2. Slug: required, valid characters
      const slugVal = (formData.slug || formData.appId || '').trim();
      const hasSlug = Boolean(slugVal && /^[a-z0-9_.-]+$/.test(slugVal));

      // 3. Organization: required
      const hasOrg = Boolean(formData.organization && formData.organization.trim());

      // 4. Logo: required
      const hasLogo = Boolean(
        formData.logo &&
        formData.logo.trim() &&
        (formData.logo.startsWith('http') ||
          formData.logo.startsWith('data:image/') ||
          formData.logo.startsWith('/'))
      );

      return hasName && hasSlug && hasOrg && hasLogo;
    }

    case 2: {
      // 1. Owner Email: required, valid format
      const hasOwnerEmail = Boolean(
        formData.ownerEmail &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail.trim())
      );

      // 2. Support Email: optional, but if present must be valid format
      const isSupportEmailValid =
        !formData.supportEmail ||
        formData.supportEmail.trim() === '' ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail.trim());

      return hasOwnerEmail && isSupportEmailValid;
    }

    case 3: {
      const method = formData.integrationMethod;
      if (!method) return false;

      if (method === IntegrationMethod.WEBVIEW) {
        const prodUrl = formData.integrationConfigWebView?.productionUrl?.trim();
        const hasUrl = Boolean(prodUrl && prodUrl.length > 0);
        const isVerified = Boolean(formData.isDomainVerified);
        return hasUrl && isVerified;
      }

      if (method === IntegrationMethod.FLUTTER_PACKAGE) {
        const conf = formData.integrationConfigFlutter;
        if (conf?.sourceType === SourceType.GIT) {
          const hasGitUrl = Boolean(conf.gitUrl && conf.gitUrl.trim());
          if (conf.isPrivateRepo && conf.authMethod === 'token') {
            return hasGitUrl && Boolean(conf.gitAccessToken && conf.gitAccessToken.trim());
          }
          return hasGitUrl;
        }

        // Artifact / upload source
        const hasArchive = Boolean(
          pendingArchiveFile ||
          conf?.packageStoragePath ||
          conf?.archiveChecksum ||
          conf?.packageUrl ||
          conf?.minioKey ||
          (conf as any)?.archiveFilename ||
          (conf as any)?.isArchiveSubmission
        );
        const hasPkgName = Boolean(conf?.packageName && conf.packageName.trim());
        const hasVersion = Boolean(conf?.versionConstraint && conf.versionConstraint.trim());
        return hasArchive && hasPkgName && hasVersion;
      }

      if (method === IntegrationMethod.NATIVE_SDK) {
        const conf = formData.integrationConfigNativeSdk;
        return Boolean(
          (conf?.androidPackageName && conf.androidPackageName.trim()) ||
          (conf?.iosModuleName && conf.iosModuleName.trim())
        );
      }

      if (method === IntegrationMethod.DEEP_LINK) {
        const conf = formData.integrationConfigDeepLink;
        return Boolean(conf?.urlScheme && conf.urlScheme.trim());
      }

      return false;
    }

    case 4: {
      // Capabilities are optional; if any selected, each must have a purpose
      if (formData.permissions && formData.permissions.length > 0) {
        return formData.permissions.every(
          (p) => p.purpose && p.purpose.trim().length > 0
        );
      }
      return true;
    }

    case 5: {
      // Terms and Privacy Policy are optional; if provided, must be valid
      return true;
    }

    case 6: {
      // Review & Submit
      return true;
    }

    default:
      return false;
  }
}

/**
 * Returns a record of completion status for each step (1 to 6).
 */
export function getStepsCompletionMap(
  formData: Partial<CreateMiniAppDto>,
  pendingArchiveFile?: File | null,
  maxVisitedStep: number = 1
): Record<number, boolean> {
  const step1 = isStepRequiredInfoComplete(1, formData, pendingArchiveFile);
  const step2 = step1 && isStepRequiredInfoComplete(2, formData, pendingArchiveFile);
  const step3 = step2 && isStepRequiredInfoComplete(3, formData, pendingArchiveFile);
  const step4 = step3 && isStepRequiredInfoComplete(4, formData, pendingArchiveFile);
  const step5 = step4 && isStepRequiredInfoComplete(5, formData, pendingArchiveFile);
  const step6 = step5 && isStepRequiredInfoComplete(6, formData, pendingArchiveFile);

  return {
    1: step1,
    2: step2 && maxVisitedStep >= 2,
    3: step3 && maxVisitedStep >= 3,
    4: step4 && maxVisitedStep >= 4,
    5: step5 && maxVisitedStep >= 5,
    6: step6 && maxVisitedStep >= 6,
  };
}
