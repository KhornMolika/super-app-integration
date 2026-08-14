import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsUrl, IsArray, ValidateNested, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUrlReachable } from '../../common/validators/is-url-reachable.validator';

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
  @IsUrl({ require_tld: false })
  @IsUrlReachable()
  @IsNotEmpty()
  productionUrl!: string;

  @IsUrl({ require_tld: false })
  @IsUrlReachable()
  @IsOptional()
  stagingUrl?: string;
}

export class FlutterPackageConfigDto {
  @IsEnum(SourceType)
  @IsNotEmpty()
  sourceType!: SourceType;

  // If GIT
  @ValidateIf(o => o.sourceType === SourceType.GIT)
  @IsUrl({ require_tld: false })
  @IsUrlReachable()
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

  @IsUrl({ require_tld: false })
  @IsUrlReachable()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsEmail()
  @IsNotEmpty()
  ownerEmail!: string;

  @IsEmail()
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
