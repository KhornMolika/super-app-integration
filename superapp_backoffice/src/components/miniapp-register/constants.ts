import { IntegrationMethod, SourceType, CreateMiniAppDto } from '@/types/miniapp.types';
import { generateClientVerificationToken } from '@/components/forms/IntegrationForm';

export const STEP_TITLES = [
  'Basics',
  'Integration',
  'Permissions',
  'Security scans',
  'Review',
] as const;

export const STEP_DESCRIPTIONS = [
  'Name, icon and description shown in the Super App. Terms and privacy are optional.',
  'How the Super App runs your app.',
  'Device features your app needs, and why.',
  'Scans that run on every submission. Recommended ones are on.',
  'Check everything, then submit for review.',
] as const;

export const TOTAL_STEPS = STEP_TITLES.length;

/**
 * Validation sections (the numbers the validators use) behind each wizard
 * step: 1 basics, 2 terms & privacy, 3 integration, 4 permissions, 5 scans.
 */
export const STEP_SECTIONS: readonly (readonly number[])[] = [[1, 2], [3], [4], [5], []];

/** The wizard step that shows a validation section. */
export function stepOfSection(section: number): number {
  const i = STEP_SECTIONS.findIndex((secs) => secs.includes(section));
  return i >= 0 ? i + 1 : 1;
}

export function getInitialRegisterFormData(): Partial<CreateMiniAppDto> {
  return {
    name: '',
    appId: '',
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
    homeWidget: null,
    permissions: [],
    securityChecks: [],
  };
}
