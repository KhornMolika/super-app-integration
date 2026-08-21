import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsUrl, IsArray, ValidateNested, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

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

export class WebViewConfigDto {
  @IsString()
  @IsOptional()
  productionUrl?: string;

  @IsString()
  @IsOptional()
  stagingUrl?: string;
}

export class FlutterPackageConfigDto {
  @IsEnum(SourceType)
  @IsOptional()
  sourceType?: SourceType;

  // If GIT
  @ValidateIf(o => o.sourceType === SourceType.GIT)
  @IsString()
  @IsOptional()
  gitUrl?: string;

  @ValidateIf(o => o.sourceType === SourceType.GIT)
  @IsString()
  @IsOptional()
  gitBranch?: string;

  @ValidateIf(o => o.sourceType === SourceType.GIT)
  @IsString()
  @IsOptional()
  gitAccessToken?: string;

  @ValidateIf(o => o.sourceType === SourceType.GIT)
  @IsString()
  @IsOptional()
  gitPath?: string;

  // If ARTIFACT
  @ValidateIf(o => o.sourceType === SourceType.ARTIFACT)
  @IsString()
  @IsOptional()
  packageName?: string;

  @ValidateIf(o => o.sourceType === SourceType.ARTIFACT)
  @IsString()
  @IsOptional()
  versionConstraint?: string;
}

export class DeepLinkConfigDto {
  @IsString()
  @IsNotEmpty()
  urlScheme!: string;

  @IsString()
  @IsOptional()
  packageName?: string;

  @IsString()
  @IsOptional()
  appStoreUrl?: string;
}

export class PermissionDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsString()
  @IsOptional()
  termsUrl?: string;

  @IsOptional()
  required?: boolean;

  @IsString()
  @IsOptional()
  requestedVersion?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  metadata?: any;
}

export class CreateMiniAppDto {
  @IsString()
  @IsNotEmpty()
  appId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  fullDescription?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsNotEmpty()
  ownerEmail!: string;

  @IsString()
  @IsOptional()
  supportEmail?: string;

  @IsString()
  @IsOptional()
  teamName?: string;

  @IsEnum(IntegrationMethod)
  @IsNotEmpty()
  integrationMethod!: IntegrationMethod;

  @ValidateIf(o => o.integrationMethod === IntegrationMethod.WEBVIEW)
  @ValidateNested()
  @Type(() => WebViewConfigDto)
  @IsNotEmpty()
  integrationConfigWebView?: WebViewConfigDto;

  @ValidateIf(o => o.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE)
  @ValidateNested()
  @Type(() => FlutterPackageConfigDto)
  @IsNotEmpty()
  integrationConfigFlutter?: FlutterPackageConfigDto;

  @ValidateIf(o => o.integrationMethod === IntegrationMethod.DEEP_LINK)
  @ValidateNested()
  @Type(() => DeepLinkConfigDto)
  @IsNotEmpty()
  integrationConfigDeepLink?: DeepLinkConfigDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  @IsOptional()
  permissions?: PermissionDto[];
}
