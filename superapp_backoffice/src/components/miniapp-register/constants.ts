import { IntegrationMethod, SourceType, CreateMiniAppDto } from '@/types/miniapp.types';
import { generateClientVerificationToken } from '@/components/forms/IntegrationForm';

export const STEP_TITLES = [
  'General Information',
  'Legal & Compliance Policies',
  'Technical Integration',
  'Capabilities & Scopes',
  'Security & Compliance Profile',
  'Review Registration',
] as const;

export const STEP_DESCRIPTIONS = [
  'Provide app identity, catalog details, display name, organization, and icon.',
  'Configure official terms of service, privacy disclosures, and regulatory policies.',
  'Configure your runtime architecture: WebView, Flutter Package, Native SDK, or Deep Link.',
  'Declare native host device permissions with user privacy justifications.',
  'Automated TLS verification, domain checks, and compliance validation.',
  'Inspect all registration parameters before submitting for platform audit.',
] as const;

export function getInitialRegisterFormData(): Partial<CreateMiniAppDto> {
  return {
    name: '',
    appId: '',
    category: '',
    organization: '',
    organizationCode: '',
    shortDescription: '',
    fullDescription: '',
    logo: '',
    termsUrl: '',
    termsDescription: '',
    privacyPolicyUrl: '',
    privacyPolicyDescription: '',
    teamName: '',
    ownerName: '',
    ownerEmail: '',
    supportEmail: '',
    teamTelegramChatId: '',
    integrationMethod: IntegrationMethod.WEBVIEW,
    verificationToken: generateClientVerificationToken(),
    integrationConfigWebView: {
      productionUrl: '',
      verificationToken: generateClientVerificationToken(),
    },
    integrationConfigFlutter: {
      sourceType: SourceType.ARTIFACT,
      packageName: '',
      versionConstraint: '',
    },
    integrationConfigNativeSdk: {
      iosModuleName: '',
      iosTypeName: '',
      iosArtifactFilename: '',
      androidPackageName: '',
      androidObjectName: '',
      androidArtifactFilename: '',
      androidMavenGroupId: 'com.fsa.sdk',
      androidMavenArtifactId: '',
      androidMavenVersion: '1.0.0',
    },
    integrationConfigDeepLink: {
      urlScheme: '',
      packageName: '',
      appStoreUrl: '',
    },
    permissions: [],
    securityChecks: [],
  };
}
