import {
  IsString,
  IsArray,
  IsOptional,
  IsIn,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BundledMiniAppDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  packageName!: string;

  @IsString()
  version!: string;

  @IsOptional()
  @IsString()
  approvedChecksum?: string;

  @IsOptional()
  @IsArray()
  declaredPermissions?: any[];
}

export class VerifyAndAssembleReleaseDto {
  @IsString()
  releaseVersion!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundledMiniAppDto)
  miniApps!: BundledMiniAppDto[];

  @IsOptional()
  @IsString()
  environment?: string;
}

export interface ReleaseAssemblyAuditResult {
  passed: boolean;
  status: 'PASSED' | 'FAILED';
  releaseVersion: string;
  timestamp: string;
  verifiedApps: Array<{
    id: string;
    packageName: string;
    version: string;
    nexusChecksum: string;
    approvedChecksum: string;
    checksumMatched: boolean;
    dependencies: Record<string, string>;
  }>;
  conflicts: string[];
  manifest: {
    superAppVersion: string;
    buildTimestamp: string;
    bundledMiniApps: Array<{
      id: string;
      packageName: string;
      version: string;
      checksum: string;
      entryPoint: string;
    }>;
    consolidatedPermissions: string[];
    integrityDigest: string;
  };
  buildTriggered?: boolean;
  apkUrl?: string;
}

// Backwards compatibility alias
export type Gate2AuditResult = ReleaseAssemblyAuditResult;

export const BUILD_STAGE_STATUSES = ['RUNNING', 'COMPLETED', 'FAILED'] as const;

export class BuildStageUpdateDto {
  @IsString()
  @MaxLength(128)
  appName!: string;

  @IsString()
  @MaxLength(64)
  releaseVersion!: string;

  @IsString()
  @MaxLength(64)
  stageId!: string;

  @IsString()
  @MaxLength(128)
  stageName!: string;

  @IsIn(BUILD_STAGE_STATUSES)
  status!: 'RUNNING' | 'COMPLETED' | 'FAILED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}

/** Terminal states Jenkins may report; COMPLETED/SUCCESS = success, the rest = failed build. */
export const BUILD_CALLBACK_STATUSES = [
  'COMPLETED',
  'SUCCESS',
  'FAILED',
  'FAILURE',
  'ABORTED',
] as const;

export class BuildCallbackDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  appName?: string;

  @IsString()
  @MaxLength(64)
  releaseVersion!: string;

  @IsIn(BUILD_CALLBACK_STATUSES)
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  buildType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  apkUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  filename?: string;
}
