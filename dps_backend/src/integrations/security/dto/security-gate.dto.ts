import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { GitProviderType } from '../../git/git-provider.interface';

export enum SecuritySeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export enum GateStatus {
  PASSED = 'PASSED',
  WARNING = 'WARNING',
  FAILED = 'FAILED',
}

export interface SecurityFinding {
  id: string;
  category: 'CODE_ANALYSIS' | 'SECRETS' | 'PERMISSIONS' | 'COMPATIBILITY' | 'INTEGRITY';
  severity: SecuritySeverity;
  title: string;
  description: string;
  file?: string;
  line?: number;
  recommendation?: string;
}

export interface SecurityGateReport {
  gate: 'GATE_1';
  status: GateStatus;
  score: number; // 0 - 100
  timestamp: string;
  target: {
    packageName?: string;
    version?: string;
    gitUrl?: string;
    ref?: string;
    path?: string;
  };
  metrics: {
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  checks: {
    staticAnalysis: { passed: boolean; issuesCount: number };
    secretScan: { passed: boolean; leaksFound: number };
    permissionCompliance: { passed: boolean; undeclaredPlugins: string[] };
    coreSdkCompatibility: { passed: boolean; coreVersion?: string; details?: string };
    integrityCheck: { passed: boolean; sha256?: string };
  };
  findings: SecurityFinding[];
}

export class RunSecurityGate1Dto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsEnum(['github', 'gitlab'])
  @IsOptional()
  provider?: GitProviderType;

  @IsString()
  @IsOptional()
  ref?: string;

  @IsString()
  @IsOptional()
  path?: string;

  @IsString()
  @IsOptional()
  token?: string;

  @IsOptional()
  declaredPermissions?: Array<{ type: string; purpose?: string }>;
}
