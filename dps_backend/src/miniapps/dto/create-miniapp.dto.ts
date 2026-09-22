import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUrl,
  IsArray,
  ValidateNested,
  ValidateIf,
  IsBoolean,
  IsNumber,
  Matches,
} from 'class-validator';
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

export class WebViewConfigDto {
  @IsString()
  @IsOptional()
  productionUrl?: string;

  @IsString()
  @IsOptional()
  stagingUrl?: string;

  @IsArray()
  @IsOptional()
  allowedDomains?: string[];

  @IsString()
  @IsOptional()
  bridgeApiVersion?: string;

  @IsString()
  @IsOptional()
  verificationToken?: string;

  @IsBoolean()
  @IsOptional()
  isDomainVerified?: boolean;

  @IsOptional()
  domainVerifiedAt?: Date | string;
}

export class FlutterPackageConfigDto {
  @IsEnum(SourceType)
  @IsOptional()
  sourceType?: SourceType;

  // If GIT
  @ValidateIf((o) => o.sourceType === SourceType.GIT)
  @IsString()
  @IsOptional()
  gitUrl?: string;

  @ValidateIf((o) => o.sourceType === SourceType.GIT)
  @IsString()
  @IsOptional()
  gitBranch?: string;

  @ValidateIf((o) => o.sourceType === SourceType.GIT)
  @IsString()
  @IsOptional()
  gitAccessToken?: string;

  @ValidateIf((o) => o.sourceType === SourceType.GIT)
  @IsString()
  @IsOptional()
  gitPath?: string;

  @ValidateIf((o) => o.sourceType === SourceType.GIT)
  @IsBoolean()
  @IsOptional()
  isPrivateRepo?: boolean;

  @ValidateIf((o) => o.sourceType === SourceType.GIT)
  @IsEnum(['none', 'deploy_key', 'token'])
  @IsOptional()
  authMethod?: 'none' | 'deploy_key' | 'token';

  @ValidateIf((o) => o.sourceType === SourceType.GIT)
  @IsString()
  @IsOptional()
  deployKey?: string;

  @ValidateIf((o) => o.sourceType === SourceType.GIT)
  @IsString()
  @IsOptional()
  deployKeyTitle?: string;

  // If ARTIFACT
  @ValidateIf((o) => o.sourceType === SourceType.ARTIFACT)
  @IsString()
  @IsOptional()
  packageName?: string;

  @ValidateIf((o) => o.sourceType === SourceType.ARTIFACT)
  @IsString()
  @IsOptional()
  versionConstraint?: string;

  @IsString()
  @IsOptional()
  packageStoragePath?: string;

  @IsString()
  @IsOptional()
  packageUrl?: string;

  @IsString()
  @IsOptional()
  archiveChecksum?: string;

  @IsString()
  @IsOptional()
  archiveFilename?: string;

  @IsNumber()
  @IsOptional()
  archiveSize?: number;

  @IsNumber()
  @IsOptional()
  archiveOriginalSize?: number;

  @IsNumber()
  @IsOptional()
  archiveStrippedFilesCount?: number;

  @IsBoolean()
  @IsOptional()
  isSanitized?: boolean;

  @IsBoolean()
  @IsOptional()
  isArchiveSubmission?: boolean;
}

// Allow-lists: these values are rendered into Gradle/Swift/Kotlin/Podfile source.
const NATIVE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NATIVE_PACKAGE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const MAVEN_COORD = /^[A-Za-z0-9_.-]+$/;
const MAVEN_VERSION = /^[A-Za-z0-9_.+-]+$/;

export class NativeSdkConfigDto {
  @IsString()
  @IsNotEmpty()
  @Matches(NATIVE_IDENTIFIER, {
    message: 'iosModuleName must be a valid identifier',
  })
  iosModuleName!: string; // 'SpaBookingSDK'

  @IsString()
  @IsNotEmpty()
  @Matches(NATIVE_IDENTIFIER, {
    message: 'iosTypeName must be a valid identifier',
  })
  iosTypeName!: string; // 'SpaBookingSDKView'

  @IsString()
  @IsNotEmpty()
  iosArtifactFilename!: string; // 'SpaBookingSDK.xcframework.zip'

  @IsString()
  @IsNotEmpty()
  @Matches(NATIVE_PACKAGE, {
    message: 'androidPackageName must be a dotted package name',
  })
  androidPackageName!: string; // 'com.example.spabooking'

  @IsString()
  @IsNotEmpty()
  @Matches(NATIVE_IDENTIFIER, {
    message: 'androidObjectName must be a valid identifier',
  })
  androidObjectName!: string; // 'SpaBookingSDK'

  @IsString()
  @IsNotEmpty()
  androidArtifactFilename!: string; // 'spa-booking-sdk-1.0.0.aar'

  @IsString()
  @IsNotEmpty()
  @Matches(MAVEN_COORD, {
    message: 'androidMavenGroupId may only contain letters, digits, _ . -',
  })
  androidMavenGroupId!: string; // 'com.fsa.sdk'

  @IsString()
  @IsNotEmpty()
  @Matches(MAVEN_COORD, {
    message: 'androidMavenArtifactId may only contain letters, digits, _ . -',
  })
  androidMavenArtifactId!: string; // 'spa-booking-sdk'

  @IsString()
  @IsNotEmpty()
  @Matches(MAVEN_VERSION, {
    message: 'androidMavenVersion may only contain letters, digits, _ . + -',
  })
  androidMavenVersion!: string; // '1.0.0'
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
  organization?: string;

  @IsString()
  @IsOptional()
  organizationCode?: string;

  @IsString()
  @IsOptional()
  termsUrl?: string;

  @IsString()
  @IsOptional()
  termsDescription?: string;

  @IsString()
  @IsOptional()
  privacyPolicyUrl?: string;

  @IsString()
  @IsOptional()
  privacyPolicyDescription?: string;

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

  @IsString()
  @IsOptional()
  teamTelegramChatId?: string;

  @IsEnum(IntegrationMethod)
  @IsNotEmpty()
  integrationMethod!: IntegrationMethod;

  @ValidateIf((o) => o.integrationMethod === IntegrationMethod.WEBVIEW)
  @ValidateNested()
  @Type(() => WebViewConfigDto)
  @IsNotEmpty()
  integrationConfigWebView?: WebViewConfigDto;

  @ValidateIf((o) => o.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE)
  @ValidateNested()
  @Type(() => FlutterPackageConfigDto)
  @IsNotEmpty()
  integrationConfigFlutter?: FlutterPackageConfigDto;

  @ValidateIf((o) => o.integrationMethod === IntegrationMethod.DEEP_LINK)
  @ValidateNested()
  @Type(() => DeepLinkConfigDto)
  @IsNotEmpty()
  integrationConfigDeepLink?: DeepLinkConfigDto;

  @ValidateIf((o) => o.integrationMethod === IntegrationMethod.NATIVE_SDK)
  @ValidateNested()
  @Type(() => NativeSdkConfigDto)
  @IsNotEmpty()
  integrationConfigNativeSdk?: NativeSdkConfigDto;

  // In the controller, we can map integrationConfigWebView, integrationConfigFlutter, integrationConfigDeepLink, or integrationConfigNativeSdk to integrationConfig before saving

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  @IsOptional()
  permissions?: PermissionDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  securityChecks?: string[];

  @IsString()
  @IsOptional()
  verificationToken?: string;

  @IsBoolean()
  @IsOptional()
  isDomainVerified?: boolean;

  @IsOptional()
  domainVerifiedAt?: Date | string;
}
