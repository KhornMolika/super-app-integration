import { API_URL } from '@/lib/config';
import { CreateMiniAppDto, IntegrationMethod, PermissionDto, SourceType } from '@/types/miniapp.types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  detectedPermissions?: PermissionDto[];
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
    if (formData.termsUrl && !formData.termsUrl.startsWith('http')) {
      errors.termsUrl = 'Terms & Conditions URL must be a valid URL (e.g. https://...)';
      isValid = false;
    }
    if (formData.privacyPolicyUrl && !formData.privacyPolicyUrl.startsWith('http')) {
      errors.privacyPolicyUrl = 'Privacy Policy URL must be a valid URL (e.g. https://...)';
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
        const isDev =
          process.env.NEXT_PUBLIC_ENVIRONMENT === 'DEV' ||
          process.env.NODE_ENV !== 'production' ||
          (typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

        if (!isDev && !prodUrl.startsWith('https://')) {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL must use HTTPS in production';
          isValid = false;
        }

        if (isValid) {
          try {
            const res = await fetch(`${API_URL}/mini-apps/check-url?url=${encodeURIComponent(prodUrl)}`);
            const data = await res.json();
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
        if (!conf.packageName) {
          errors['integrationConfigFlutter.packageName'] = 'Package Name is required';
          isValid = false;
        } else if (isValid) {
          try {
            const res = await fetch(`/api/integrations/nexus/packages/${encodeURIComponent(conf.packageName)}`);
            const data = await res.json();
            if (data && data.exists === false) {
              errors['integrationConfigFlutter.packageName'] =
                `Package "${conf.packageName}" does not exist on Nexus. Please save as Draft or publish the package to Nexus before submitting for review.`;
              isValid = false;
            }
          } catch (e) {
            // non-blocking if offline
          }
        }
        if (!conf.versionConstraint) {
          errors['integrationConfigFlutter.versionConstraint'] = 'Version Constraint is required';
          isValid = false;
        }
      } else {
        if (!conf?.gitUrl) {
          errors['integrationConfigFlutter.gitUrl'] = 'Git URL is required';
          isValid = false;
        } else if (isValid) {
          try {
            const res = await fetch('/api/integrations/git/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: conf.gitUrl,
                ref: conf.gitBranch,
                token: conf.gitAccessToken,
                path: conf.gitPath,
              }),
            });
            const data = await res.json();
            if (data && data.validation) {
              if (!data.validation.isValid) {
                errors['integrationConfigFlutter.gitUrl'] =
                  data.validation.error || 'Git repository or pubspec.yaml could not be verified.';
                isValid = false;
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
                  if (permType && !currentPerms.some((p) => p.type === permType)) {
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
          } catch (e) {
            // non-blocking if offline
          }
        }
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

  return { isValid, errors, detectedPermissions };
}
