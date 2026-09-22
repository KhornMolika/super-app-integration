import { miniappsApi, integrationsApi } from '@/api';
import { CreateMiniAppDto, IntegrationMethod, PermissionDto, SourceType } from '@/types/miniapp.types';
import { validateUrlFormat } from '@/components/ui/ValidatedUrlInput';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  detectedPermissions?: PermissionDto[];
}

/**
 * Derives a standardized Dart package name from a Git repository URL or subfolder path.
 * e.g., "git@git.example.com:partner/sample-miniapp.git" -> "sample_miniapp"
 */
export function inferPackageNameFromGitUrl(
  url?: string,
  gitPath?: string,
): string {
  if (gitPath && gitPath.trim()) {
    const segments = gitPath.trim().replace(/\/+$/, '').split('/');
    const lastSeg = segments[segments.length - 1];
    if (lastSeg) {
      return lastSeg.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }
  }

  if (!url || !url.trim()) return '';
  const cleanUrl = url.trim().replace(/\.git\/?$/, '');

  const sshMatch = cleanUrl.match(
    /^[a-zA-Z0-9._-]+@[^:]+:(?:[^/]+\/)*([^/]+)$/,
  );
  if (sshMatch && sshMatch[1]) {
    return sshMatch[1].toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  const httpMatch = cleanUrl.match(/^https?:\/\/[^/]+(?:\/[^/]+)*\/([^/?#]+)/);
  if (httpMatch && httpMatch[1]) {
    return httpMatch[1].toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  const lastPart = cleanUrl.split(/[/:]/).filter(Boolean).pop() || '';
  return lastPart.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

/**
 * Validates form step data for Mini App registration and editing
 */
export async function validateMiniAppStep(
  currentStep: number,
  formData: Partial<CreateMiniAppDto>
): Promise<ValidationResult> {
  const errors: Record<string, string> = {};
  let isValid = true;
  let detectedPermissions: PermissionDto[] | undefined = undefined;

  if (currentStep === 1) {
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Mini App Name must be at least 2 characters';
      isValid = false;
    }
    if (!formData.appId) {
      errors.appId = 'Mini App ID is required';
      isValid = false;
    } else if (!/^[a-z0-9_.-]+$/.test(formData.appId)) {
      errors.appId = 'Mini App ID can only contain lowercase letters, numbers, and underscores (e.g. miniapp_8f32a1)';
      isValid = false;
    }
    if (!formData.logo || !formData.logo.trim()) {
      errors.logo = 'Logo is required';
      isValid = false;
    } else if (
      !formData.logo.startsWith('http') &&
      !formData.logo.startsWith('data:image/') &&
      !formData.logo.startsWith('/')
    ) {
      errors.logo = 'Logo must be an uploaded image or valid URL';
      isValid = false;
    }
  }

  if (currentStep === 2) {
    if (!formData.ownerEmail) {
      errors.ownerEmail = 'Owner Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      errors.ownerEmail = 'Owner Email must be a valid email';
      isValid = false;
    }
    if (formData.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail)) {
      errors.supportEmail = 'Support Email must be a valid email';
      isValid = false;
    }
  }

  if (currentStep === 3) {
    if (formData.integrationMethod === IntegrationMethod.WEBVIEW) {
      const prodUrl = formData.integrationConfigWebView?.productionUrl;
      if (!prodUrl) {
        errors['integrationConfigWebView.productionUrl'] = 'Production URL is required';
        isValid = false;
      } else {
        const envVal = (
          process.env.NEXT_PUBLIC_ENVIRONMENT ||
          process.env.ENVIRONMENT ||
          process.env.NODE_ENV ||
          ''
        ).toUpperCase();
        const isDev =
          envVal !== 'PROD' &&
          (envVal === 'DEV' ||
            (typeof window !== 'undefined' &&
              (window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.endsWith('.local') ||
                window.location.hostname.endsWith('.orb.local') ||
                /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(window.location.hostname))));

        if (!isDev && !prodUrl.startsWith('https://')) {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL must use HTTPS in PROD mode';
          isValid = false;
        }

        if (isValid) {
          try {
            const data = await miniappsApi.checkUrl(prodUrl);
            if (!data.reachable) {
              errors['integrationConfigWebView.productionUrl'] = 'Production URL is not reachable';
              isValid = false;
            }
          } catch (e) {
            errors['integrationConfigWebView.productionUrl'] = 'Error checking URL reachability';
            isValid = false;
          }
        }
      }

      // Domain ownership verification is strictly required for WebView integration
      if (!formData.isDomainVerified) {
        errors['integrationConfigWebView.domainVerification'] =
          'Domain ownership has not been verified. Please host the verification association file and verify domain ownership before proceeding to the next step.';
        isValid = false;
      }
    }

    if (formData.integrationMethod === IntegrationMethod.DEEP_LINK) {
      const conf = formData.integrationConfigDeepLink;
      if (!conf?.urlScheme || conf.urlScheme.trim() === '') {
        errors['integrationConfigDeepLink.urlScheme'] =
          'URL Scheme is required (e.g. trustregulator:// or myapp://open)';
        isValid = false;
      }
    }

    if (formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE) {
      const conf = formData.integrationConfigFlutter;
      if (conf?.sourceType === SourceType.ARTIFACT) {
        const hasArchive = Boolean(
          conf?.packageStoragePath ||
          conf?.archiveChecksum ||
          conf?.packageUrl ||
          conf?.minioKey ||
          (conf as any)?.archiveFilename ||
          (conf as any)?.isArchiveSubmission ||
          (formData as any)?.pendingArchiveFile,
        );

        if (!hasArchive) {
          errors['integrationConfigFlutter.archiveFile'] =
            'Please upload a package archive (.zip or .tar.gz) before proceeding.';
          isValid = false;
        }

        if (!conf?.packageName || !conf.packageName.trim()) {
          errors['integrationConfigFlutter.packageName'] =
            'Package Name is required. Upload a package archive containing manifest or pubspec.';
          isValid = false;
        }
        if (!conf?.versionConstraint || !conf.versionConstraint.trim()) {
          errors['integrationConfigFlutter.versionConstraint'] = 'Version Constraint is required';
          isValid = false;
        }
      } else {
        if (!conf?.gitUrl || !conf.gitUrl.trim()) {
          errors['integrationConfigFlutter.gitUrl'] = 'Git URL is required';
          isValid = false;
        } else {
          if (
            conf?.isPrivateRepo &&
            conf?.authMethod === 'token' &&
            !conf?.gitAccessToken?.trim()
          ) {
            errors['integrationConfigFlutter.gitAccessToken'] =
              'Access Token is required for private repositories when Token authentication is selected.';
            isValid = false;
          }

          const isDeployKey =
            (Boolean(conf?.isPrivateRepo) && conf?.authMethod !== 'token') ||
            Boolean(conf?.gitUrl?.trim().startsWith('git@'));

          // Infer package name if missing
          const inferredPkg = inferPackageNameFromGitUrl(
            conf.gitUrl,
            conf.gitPath,
          );
          if (inferredPkg && (!conf.packageName || !conf.packageName.trim())) {
            conf.packageName = inferredPkg;
          }

          try {
            const data = await integrationsApi.validateGit({
              url: conf.gitUrl,
              ref: conf.gitBranch,
              token: conf.isPrivateRepo ? conf.gitAccessToken : undefined,
              path: conf.gitPath,
              isPrivate: conf.isPrivateRepo,
              authMethod: conf.authMethod,
              deployKey: conf.deployKey,
            });
            if (data && data.validation) {
              if (data.validation.packageName) {
                conf.packageName = data.validation.packageName;
              }

              if (!data.validation.isValid) {
                if (!isDeployKey) {
                  const is404NotFound =
                    data.validation.error?.toLowerCase().includes('not found') ||
                    data.validation.error?.includes('404');
                  if (is404NotFound) {
                    errors['integrationConfigFlutter.gitUrl'] =
                      `File 'pubspec.yaml' not found or repository is private. If this repository is private, please select '🔒 Private Repository' and configure an SSH Deploy Key or Access Token.`;
                  } else {
                    errors['integrationConfigFlutter.gitUrl'] =
                      data.validation.error ||
                      'Git repository or pubspec.yaml could not be verified.';
                  }
                  isValid = false;
                }
              } else {
                // Auto-detect required native permissions from dependencies
                const deps = data.validation.dependencies || {};
                const currentPerms = [...(formData.permissions || [])];
                const pluginMap: Record<string, string> = {
                  nfc_manager: 'NFC',
                  camera: 'CAMERA',
                  geolocator: 'LOCATION',
                  location: 'LOCATION',
                  local_auth: 'BIOMETRICS',
                  image_picker: 'PHOTO_LIBRARY',
                  file_picker: 'STORAGE',
                  contacts_service: 'CONTACTS',
                };

                let added = false;
                Object.keys(deps).forEach((dep) => {
                  const permType = pluginMap[dep];
                  if (
                    permType &&
                    !currentPerms.some((p) => p.type === permType)
                  ) {
                    currentPerms.push({
                      type: permType,
                      purpose: `Required for ${dep} platform capability`,
                      termsUrl: 'https://privacy.example.com',
                    });
                    added = true;
                  }
                });

                if (added) {
                  detectedPermissions = currentPerms;
                }
              }
            }
          } catch {
            // non-blocking if offline or network error
          }
        }
      }
    }

    if (formData.integrationMethod === IntegrationMethod.NATIVE_SDK) {
      const conf = formData.integrationConfigNativeSdk;
      const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
      const DOTTED_PACKAGE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
      const MAVEN_COORD = /^[A-Za-z0-9_.-]+$/;

      if (!conf?.iosModuleName || !conf.iosModuleName.trim()) {
        errors['integrationConfigNativeSdk.iosModuleName'] = 'iOS Module Name is required';
        isValid = false;
      } else if (!IDENTIFIER.test(conf.iosModuleName.trim())) {
        errors['integrationConfigNativeSdk.iosModuleName'] = 'iOS Module Name must be a valid identifier (letters, digits, _)';
        isValid = false;
      }

      if (!conf?.iosTypeName || !conf.iosTypeName.trim()) {
        errors['integrationConfigNativeSdk.iosTypeName'] = 'iOS Type Name is required';
        isValid = false;
      } else if (!IDENTIFIER.test(conf.iosTypeName.trim())) {
        errors['integrationConfigNativeSdk.iosTypeName'] = 'iOS Type Name must be a valid identifier';
        isValid = false;
      }

      const hasIosFile = Boolean(
        conf?.iosArtifactFilename ||
        conf?.iosStoragePath ||
        (formData as any)?.pendingIosFile,
      );
      if (!hasIosFile) {
        errors['integrationConfigNativeSdk.iosArtifactFilename'] = 'Please upload an iOS framework (.xcframework.zip)';
        isValid = false;
      }

      if (!conf?.androidPackageName || !conf.androidPackageName.trim()) {
        errors['integrationConfigNativeSdk.androidPackageName'] = 'Android Package Name is required';
        isValid = false;
      } else if (!DOTTED_PACKAGE.test(conf.androidPackageName.trim())) {
        errors['integrationConfigNativeSdk.androidPackageName'] = 'Android Package Name must be a valid dotted identifier (e.g. com.example.sdk)';
        isValid = false;
      }

      if (!conf?.androidObjectName || !conf.androidObjectName.trim()) {
        errors['integrationConfigNativeSdk.androidObjectName'] = 'Android Object / Class Name is required';
        isValid = false;
      } else if (!IDENTIFIER.test(conf.androidObjectName.trim())) {
        errors['integrationConfigNativeSdk.androidObjectName'] = 'Android Object Name must be a valid identifier';
        isValid = false;
      }

      if (!conf?.androidMavenGroupId || !conf.androidMavenGroupId.trim()) {
        errors['integrationConfigNativeSdk.androidMavenGroupId'] = 'Maven Group ID is required';
        isValid = false;
      } else if (!MAVEN_COORD.test(conf.androidMavenGroupId.trim())) {
        errors['integrationConfigNativeSdk.androidMavenGroupId'] = 'Maven Group ID may only contain letters, digits, _, ., -';
        isValid = false;
      }

      if (!conf?.androidMavenArtifactId || !conf.androidMavenArtifactId.trim()) {
        errors['integrationConfigNativeSdk.androidMavenArtifactId'] = 'Maven Artifact ID is required';
        isValid = false;
      } else if (!MAVEN_COORD.test(conf.androidMavenArtifactId.trim())) {
        errors['integrationConfigNativeSdk.androidMavenArtifactId'] = 'Maven Artifact ID may only contain letters, digits, _, ., -';
        isValid = false;
      }

      if (!conf?.androidMavenVersion || !conf.androidMavenVersion.trim()) {
        errors['integrationConfigNativeSdk.androidMavenVersion'] = 'Maven Version is required';
        isValid = false;
      }

      const hasAndroidFile = Boolean(
        conf?.androidArtifactFilename ||
        conf?.androidStoragePath ||
        (formData as any)?.pendingAndroidFile,
      );
      if (!hasAndroidFile) {
        errors['integrationConfigNativeSdk.androidArtifactFilename'] = 'Please upload an Android AAR (.aar)';
        isValid = false;
      }
    }

    // Step 3 Legal Policies Validation
    if (formData.termsUrl && formData.termsUrl.trim()) {
      const termsRes = validateUrlFormat(formData.termsUrl, 'Terms of Service URL', true);
      if (!termsRes.valid && termsRes.error) {
        errors.termsUrl = termsRes.error;
        isValid = false;
      }
    }
    if (formData.privacyPolicyUrl && formData.privacyPolicyUrl.trim()) {
      const privacyRes = validateUrlFormat(formData.privacyPolicyUrl, 'Privacy Policy URL', true);
      if (!privacyRes.valid && privacyRes.error) {
        errors.privacyPolicyUrl = privacyRes.error;
        isValid = false;
      }
    }
  }

  if (currentStep === 4) {
    if (formData.permissions && formData.permissions.length > 0) {
      formData.permissions.forEach((p) => {
        if (!p.purpose || p.purpose.trim() === '') {
          errors[`permission_${p.type}_purpose`] = 'Purpose is required';
          isValid = false;
        }
      });
    }
  }

  if (currentStep === 5) {
    if (!formData.securityChecks || formData.securityChecks.length === 0) {
      errors.securityChecks = 'Please select at least one security validation check before proceeding.';
      isValid = false;
    }
  }

  return { isValid, errors, detectedPermissions };
}
