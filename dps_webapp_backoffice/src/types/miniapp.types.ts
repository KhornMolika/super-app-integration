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
  packageName?: string;
  versionConstraint?: string;
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
  shortDescription?: string;
  fullDescription?: string;
  logo?: string;
  termsUrl?: string;
  privacyPolicyUrl?: string;
  
  ownerName?: string;
  ownerEmail: string;
  supportEmail?: string;
  teamName?: string;
  
  integrationMethod: IntegrationMethod;
  integrationConfigWebView?: WebViewConfigDto;
  integrationConfigFlutter?: FlutterPackageConfigDto;
  integrationConfigDeepLink?: DeepLinkConfigDto;
  verificationToken?: string;
  isDomainVerified?: boolean;
  domainVerifiedAt?: string;
  
  permissions?: PermissionDto[];
}
