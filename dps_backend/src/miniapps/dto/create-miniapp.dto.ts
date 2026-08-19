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
  @IsNotEmpty()
  productionUrl!: string;
}

export class FlutterPackageConfigDto {
  @IsEnum(SourceType)
  @IsNotEmpty()
  sourceType!: SourceType;

  // If GIT
  @ValidateIf(o => o.sourceType === SourceType.GIT)
  @IsString()
  @IsNotEmpty()
  gitUrl?: string;

  @ValidateIf(o => o.sourceType === SourceType.GIT)
  @IsString()
  @IsNotEmpty()
  gitBranch?: string;

  @ValidateIf(o => o.sourceType === SourceType.GIT)
  @IsString()
  @IsOptional()
  gitAccessToken?: string;

  // If ARTIFACT
  @ValidateIf(o => o.sourceType === SourceType.ARTIFACT)
  @IsString()
  @IsNotEmpty()
  packageName?: string;

  @ValidateIf(o => o.sourceType === SourceType.ARTIFACT)
  @IsString()
  @IsNotEmpty()
  versionConstraint?: string;
}

export class PermissionDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @IsString()
  @IsOptional()
  termsUrl?: string;

  @IsString()
  @IsOptional()
  status?: string;
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

  // In the controller, we can map integrationConfigWebView or integrationConfigFlutter to integrationConfig before saving

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  @IsOptional()
  permissions?: PermissionDto[];
}
