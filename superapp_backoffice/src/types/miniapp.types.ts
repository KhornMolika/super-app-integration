export enum IntegrationMethod {
  WEBVIEW = 'WEBVIEW',
  FLUTTER_PACKAGE = 'FLUTTER_PACKAGE',
  NATIVE_SDK = 'NATIVE_SDK',
  DEEP_LINK = 'DEEP_LINK',
}

/**
 * Home widget declaration, owned by the mini-app. Exactly one field applies per
 * integration method (see HOME_WIDGET_FIELD); null = no Home widget.
 */
export interface HomeWidget {
  widgetClass?: string;
  viewId?: string;
  url?: string;
}

export const HOME_WIDGET_FIELD: Record<
  IntegrationMethod,
  { key: 'widgetClass' | 'viewId' | 'url'; label: string; placeholder: string; help: string }
> = {
  [IntegrationMethod.FLUTTER_PACKAGE]: {
    key: 'widgetClass',
    label: 'Widget class',
    placeholder: 'HrHomeWidget',
    help: 'The widget class your package exports from `package:<name>/<name>.dart`. Its constructor must accept `onOpen` (a `VoidCallback`).',
  },
  [IntegrationMethod.NATIVE_SDK]: {
    key: 'viewId',
    label: 'Widget view ID',
    placeholder: 'spa_booking_widget',
    help: 'The platform-view type your SDK registers for its widget view on iOS and Android.',
  },
  [IntegrationMethod.WEBVIEW]: {
    key: 'url',
    label: 'Widget URL',
    placeholder: 'https://your-domain.com/widget',
    help: 'A page on one of your allowed domains, shown inside the Home widget slot.',
  },
  [IntegrationMethod.DEEP_LINK]: {
    key: 'url',
    label: 'Widget URL',
    placeholder: 'https://your-domain.com/widget',
    help: 'A page on your server, shown inside the Home widget slot.',
  },
};

export enum SourceType {
  GIT = 'GIT',
  ARTIFACT = 'ARTIFACT',
}

export interface PermissionDto {
  type: string;
  purpose: string;
  termsUrl?: string;
}

export interface WebViewConfigDto {
  productionUrl: string;
  stagingUrl?: string;
  allowedDomains?: string[];
  bridgeApiVersion?: string;
  verificationToken?: string;
}

export interface FlutterPackageConfigDto {
  sourceType: SourceType;
  gitUrl?: string;
  gitBranch?: string;
  gitAccessToken?: string;
  gitPath?: string;
  isPrivateRepo?: boolean;
  authMethod?: 'none' | 'deploy_key' | 'token';
  deployKey?: string;
  deployKeyTitle?: string;
  packageName?: string;
  versionConstraint?: string;
  packageStoragePath?: string;
  packageUrl?: string;
  minioKey?: string;
  minioUrl?: string;
  archiveChecksum?: string;
  archiveFilename?: string;
  archiveSize?: number;
  archiveOriginalSize?: number;
  archiveStrippedFilesCount?: number;
  isSanitized?: boolean;
  isArchiveSubmission?: boolean;
  widgetCandidates?: string[];
  gitWidgetCandidates?: string[];
  isScanningGitWidgets?: boolean;
}

export interface DeepLinkConfigDto {
  urlScheme: string;
  packageName?: string;
  appStoreUrl?: string;
}

export interface NativeSdkConfigDto {
  iosModuleName: string;
  iosTypeName: string;
  iosArtifactFilename: string;
  iosMinioKey?: string;
  iosMinioUrl?: string;
  iosSha256?: string;
  iosStoragePath?: string;
  iosChecksum?: string;
  iosSize?: number;
  iosVersion?: string;
  iosDetectedPermissions?: string[];

  androidPackageName: string;
  androidObjectName: string;
  androidArtifactFilename: string;
  androidMinioKey?: string;
  androidMinioUrl?: string;
  androidSha256?: string;
  androidMavenGroupId: string;
  androidMavenArtifactId: string;
  androidMavenVersion: string;
  androidStoragePath?: string;
  androidChecksum?: string;
  androidSize?: number;
  androidMinSdkVersion?: number;
  androidDetectedPermissions?: string[];
}

export interface CreateMiniAppDto {
  appId: string;
  slug?: string;
  name: string;
  tagline?: string;
  description?: string;
  organization?: string;
  organizationCode?: string;
  shortDescription?: string;
  fullDescription?: string;
  logo?: string;
  iconUrl?: string;
  termsUrl?: string;
  termsDescription?: string;
  privacyPolicyUrl?: string;
  privacyPolicyDescription?: string;
  
  ownerName?: string;
  ownerEmail?: string;
  supportEmail?: string;
  supportUrl?: string;
  teamName?: string;
  teamTelegramChatId?: string;
  alertTelegramChatId?: string;
  
  lifecycleStatus?: string;
  availabilityStatus?: string;
  capabilities?: PermissionDto[];
  
  integrationMethod: IntegrationMethod;
  integrationConfigWebView?: WebViewConfigDto;
  integrationConfigFlutter?: FlutterPackageConfigDto;
  integrationConfigNativeSdk?: NativeSdkConfigDto;
  integrationConfigDeepLink?: DeepLinkConfigDto;
  homeWidget?: HomeWidget | null;
  verificationToken?: string;
  isDomainVerified?: boolean;
  domainVerifiedAt?: string;
  
  permissions?: PermissionDto[];
  securityChecks?: string[];
  buildStages?: any;
  buildStatus?: string;
  buildError?: string;
}
