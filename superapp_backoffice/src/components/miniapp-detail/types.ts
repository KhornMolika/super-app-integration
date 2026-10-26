import { CreateMiniAppDto, IntegrationMethod, NativeSdkConfigDto, SourceType } from '@/types/miniapp.types';

export type MiniAppDetailFormData = Partial<CreateMiniAppDto> & {
  id?: string;
  _id?: string;
  status?: string;
  slug?: string;
  tagline?: string;
  validationErrors?: Record<string, string>;
  validationStatus?: string;
  validationStages?: any;
  validationReport?: any;
  buildStages?: any;
  buildStatus?: string;
  buildError?: string;
  issues?: any[];
  pendingRevision?: any;
  activeTestVersion?: string;
  currentReleaseVersion?: string;
  draftVersion?: string;
  version?: string;
  versionHistory?: any[];
  integrationConfig?: any;
  isDomainVerified?: boolean;
  domainVerifiedAt?: string;
  updatedAt?: string;
};

export type LifecycleActionType =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'request-changes'
  | 'start-testing'
  | 'activate'
  | 'suspend'
  | 'publish-revision'
  | 'discard-revision';

export interface LifecycleReasonModalState {
  isOpen: boolean;
  action: 'reject' | 'request-changes' | 'discard-revision';
  title: string;
  description: string;
  confirmText: string;
  confirmVariant: 'danger' | 'warning';
  quickSuggestions: string[];
  placeholder: string;
}

export const INITIAL_MINIAPP_FORM_DATA: MiniAppDetailFormData = {
  name: '',
  slug: '',
  appId: '',
  category: 'Insurance',
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
  integrationConfigWebView: { productionUrl: '' },
  integrationConfigFlutter: { sourceType: SourceType.ARTIFACT, packageName: '', versionConstraint: '' },
  integrationConfigDeepLink: { urlScheme: '', packageName: '', appStoreUrl: '' },
  integrationConfigNativeSdk: {
    iosModuleName: '',
    iosTypeName: '',
    iosArtifactFilename: '',
    androidPackageName: '',
    androidObjectName: '',
    androidArtifactFilename: '',
    androidMavenGroupId: '',
    androidMavenArtifactId: '',
    androidMavenVersion: '',
  },
  permissions: [],
  securityChecks: [],
  status: 'DRAFT',
  validationErrors: undefined,
  pendingRevision: undefined,
  activeTestVersion: undefined,
  currentReleaseVersion: undefined,
  draftVersion: undefined,
  version: undefined,
  versionHistory: undefined,
};
