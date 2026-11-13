import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';
import { STEP_SECTIONS, TOTAL_STEPS } from '../constants';

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
      // Step 2: Legal & Compliance Policies
      // If Terms of Service URL is provided, validate URL format
      const isTermsUrlValid =
        !formData.termsUrl ||
        formData.termsUrl.trim() === '' ||
        /^https?:\/\/.+/i.test(formData.termsUrl.trim());

      // If Privacy Policy URL is provided, validate URL format
      const isPrivacyUrlValid =
        !formData.privacyPolicyUrl ||
        formData.privacyPolicyUrl.trim() === '' ||
        /^https?:\/\/.+/i.test(formData.privacyPolicyUrl.trim());

      return isTermsUrlValid && isPrivacyUrlValid;
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

/** Every validation section behind a wizard step is complete. */
export function isWizardStepComplete(
  wizardStep: number,
  formData: Partial<CreateMiniAppDto>,
  pendingArchiveFile?: File | null
): boolean {
  const sections = STEP_SECTIONS[wizardStep - 1] || [];
  return sections.every((s) => isStepRequiredInfoComplete(s, formData, pendingArchiveFile));
}

/** What still blocks a wizard step, across its sections. */
export function getWizardStepMissing(
  wizardStep: number,
  formData: Partial<CreateMiniAppDto>,
  pendingArchiveFile?: File | null
): string[] {
  const sections = STEP_SECTIONS[wizardStep - 1] || [];
  return sections.flatMap((s) => getMissingRequirements(s, formData, pendingArchiveFile));
}

/**
 * Completion of each wizard step for the sidebar: a step counts once every
 * step up to it is complete and the developer has reached it.
 */
export function getStepsCompletionMap(
  formData: Partial<CreateMiniAppDto>,
  pendingArchiveFile?: File | null,
  maxVisitedStep: number = 1
): Record<number, boolean> {
  const map: Record<number, boolean> = {};
  let allBefore = true;
  for (let step = 1; step <= TOTAL_STEPS; step++) {
    allBefore = allBefore && isWizardStepComplete(step, formData, pendingArchiveFile);
    map[step] = allBefore && maxVisitedStep >= step;
  }
  return map;
}

const isHttpUrl = (v?: string) => !v || !v.trim() || /^https?:\/\/.+/i.test(v.trim());

/**
 * What still blocks a step, in words a developer understands. Empty when the
 * step is complete. Mirrors isStepRequiredInfoComplete.
 */
export function getMissingRequirements(
  stepNumber: number,
  formData: Partial<CreateMiniAppDto>,
  pendingArchiveFile?: File | null
): string[] {
  const missing: string[] = [];
  switch (stepNumber) {
    case 1: {
      if (!(formData.name && formData.name.trim().length >= 2)) missing.push('a name');
      const logo = formData.logo?.trim() || '';
      if (!(logo.startsWith('http') || logo.startsWith('data:image/') || logo.startsWith('/'))) missing.push('an icon');
      if (!formData.organization?.trim()) missing.push('an organization');
      const slug = (formData.slug || formData.appId || '').trim();
      if (!(slug && /^[a-z0-9_.-]+$/.test(slug))) missing.push('a valid app ID');
      break;
    }
    case 2: {
      if (!isHttpUrl(formData.termsUrl)) missing.push('a valid terms link');
      if (!isHttpUrl(formData.privacyPolicyUrl)) missing.push('a valid privacy link');
      break;
    }
    case 3: {
      const method = formData.integrationMethod;
      if (method === IntegrationMethod.WEBVIEW) {
        if (!formData.integrationConfigWebView?.productionUrl?.trim()) missing.push('the app URL');
        else if (!formData.isDomainVerified) missing.push('domain verification');
      } else if (method === IntegrationMethod.FLUTTER_PACKAGE) {
        const conf = formData.integrationConfigFlutter;
        if (conf?.sourceType === SourceType.GIT) {
          if (!conf.gitUrl?.trim()) missing.push('the Git URL');
          if (conf.isPrivateRepo && conf.authMethod === 'token' && !conf.gitAccessToken?.trim()) missing.push('an access token');
        } else if (!isStepRequiredInfoComplete(3, formData, pendingArchiveFile)) {
          missing.push('the package file, name and version');
        }
      } else if (method === IntegrationMethod.NATIVE_SDK) {
        if (!isStepRequiredInfoComplete(3, formData, pendingArchiveFile)) missing.push('an Android package or iOS module name');
      } else if (method === IntegrationMethod.DEEP_LINK) {
        if (!formData.integrationConfigDeepLink?.urlScheme?.trim()) missing.push('the URL scheme');
      } else {
        missing.push('an integration method');
      }
      break;
    }
    case 4: {
      const without = (formData.permissions || []).filter((p) => !p.purpose?.trim()).length;
      if (without > 0) missing.push(without === 1 ? 'a reason for 1 permission' : `a reason for ${without} permissions`);
      break;
    }
  }
  return missing;
}

/** "a name, an icon and the app URL" */
export function joinMissing(items: string[]): string {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
