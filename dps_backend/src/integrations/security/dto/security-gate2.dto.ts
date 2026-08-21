import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BundledMiniAppDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  packageName: string;

  @IsString()
  version: string;

  @IsOptional()
  @IsString()
  approvedChecksum?: string;

  @IsOptional()
  @IsArray()
  declaredPermissions?: any[];
}

export class VerifyAndAssembleReleaseDto {
  @IsString()
  releaseVersion: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundledMiniAppDto)
  miniApps: BundledMiniAppDto[];

  @IsOptional()
  @IsString()
  environment?: string;
}

export interface Gate2AuditResult {
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
}
