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
}

export interface FlutterPackageConfigDto {
  sourceType: SourceType;
  gitUrl?: string;
  gitBranch?: string;
  gitAccessToken?: string;
  packageName?: string;
  versionConstraint?: string;
}

export interface CreateMiniAppDto {
  appId: string;
  name: string;
  category?: string;
  shortDescription?: string;
  fullDescription?: string;
  logo?: string;
  
  ownerName?: string;
  ownerEmail: string;
  supportEmail?: string;
  teamName?: string;
  
  integrationMethod: IntegrationMethod;
  integrationConfigWebView?: WebViewConfigDto;
  integrationConfigFlutter?: FlutterPackageConfigDto;
  
  permissions?: PermissionDto[];
}
