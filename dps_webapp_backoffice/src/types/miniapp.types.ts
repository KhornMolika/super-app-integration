export enum IntegrationMethod {
  WEBVIEW = 'WEBVIEW',
  FLUTTER_PACKAGE = 'FLUTTER_PACKAGE',
  NATIVE_SDK = 'NATIVE_SDK',
  DEEP_LINK = 'DEEP_LINK',
}

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
}

export interface DeepLinkConfigDto {
  urlScheme: string;
  packageName?: string;
  appStoreUrl?: string;
}

export interface CreateMiniAppDto {
  appId: string;
  name: string;
  category?: string;
  organization?: string;
  organizationCode?: string;
  shortDescription?: string;
  fullDescription?: string;
  logo?: string;
  termsUrl?: string;
  termsDescription?: string;
  privacyPolicyUrl?: string;
  privacyPolicyDescription?: string;
  
  ownerName?: string;
  ownerEmail: string;
  supportEmail?: string;
  teamName?: string;
  teamTelegramChatId?: string;
  
  integrationMethod: IntegrationMethod;
  integrationConfigWebView?: WebViewConfigDto;
  integrationConfigFlutter?: FlutterPackageConfigDto;
  integrationConfigDeepLink?: DeepLinkConfigDto;
  verificationToken?: string;
  isDomainVerified?: boolean;
  domainVerifiedAt?: string;
  
  permissions?: PermissionDto[];
  securityChecks?: string[];
  buildStages?: any;
  buildStatus?: string;
  buildError?: string;
}
