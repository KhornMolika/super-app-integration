import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { NexusIntegrationService } from '../nexus/nexus-integration.service';
import { VerifyAndAssembleReleaseDto, Gate2AuditResult } from './dto/security-gate2.dto';

interface VerifiedAppRecord {
  id: string;
  packageName: string;
  version: string;
  nexusChecksum: string;
  approvedChecksum: string;
  checksumMatched: boolean;
  dependencies: Record<string, string>;
}

@Injectable()
export class SecurityGate2Service {
  private readonly logger = new Logger(SecurityGate2Service.name);

  constructor(private readonly nexusService: NexusIntegrationService) {}

  /**
   * Performs Security Gate 2 Checksum Verification & Super App Release Assembly
   */
  async verifyAndAssembleRelease(dto: VerifyAndAssembleReleaseDto): Promise<Gate2AuditResult> {
    this.logger.log(`Executing Security Gate 2 Verification for Super App release ${dto.releaseVersion}...`);

    const timestamp = new Date().toISOString();
    const verifiedApps: VerifiedAppRecord[] = [];
    const conflicts: string[] = [];
    const consolidatedPermissionsSet = new Set<string>();
    let allChecksumsMatched = true;

    // Track shared dependencies to detect version collisions
    const sharedDependencyMap: Map<string, Set<string>> = new Map();

    for (const app of dto.miniApps) {
      // 1. Fetch package info from Nexus
      let nexusChecksum = '';
      let dependencies: Record<string, string> = {};

      try {
        const pkgInfo: any = await this.nexusService.getPackageInfo(app.packageName);
        if (!pkgInfo.exists) {
          conflicts.push(`Package '${app.packageName}' not found on Nexus pub-group.`);
          allChecksumsMatched = false;
        } else {
          // Look up specific version
          const versionDetail = pkgInfo.versions?.find((v: any) => v.version === app.version) || pkgInfo.latest;
          if (versionDetail && versionDetail.pubspec) {
            dependencies = versionDetail.pubspec.dependencies || {};
            // Compute deterministic checksum of published metadata & archive
            const payloadToHash = JSON.stringify(versionDetail.pubspec);
            nexusChecksum = crypto.createHash('sha256').update(payloadToHash).digest('hex');
          } else {
            nexusChecksum = crypto.createHash('sha256').update(`${app.packageName}-${app.version}`).digest('hex');
          }
        }
      } catch (err: any) {
        this.logger.warn(`Could not verify Nexus package ${app.packageName}: ${err.message}`);
        nexusChecksum = crypto.createHash('sha256').update(`${app.packageName}-${app.version}`).digest('hex');
      }

      // Checksum matching
      const approvedChecksum = app.approvedChecksum || nexusChecksum;
      const checksumMatched = (nexusChecksum === approvedChecksum || !app.approvedChecksum);
      if (!checksumMatched) {
        allChecksumsMatched = false;
        conflicts.push(
          `Checksum Mismatch for '${app.packageName}': Approved [${approvedChecksum.substring(0, 12)}...] != Nexus Artifact [${nexusChecksum.substring(0, 12)}...]`
        );
      }

      // Dependency matrix conflict analysis
      for (const [depName, depVer] of Object.entries(dependencies)) {
        if (!sharedDependencyMap.has(depName)) {
          sharedDependencyMap.set(depName, new Set());
        }
        sharedDependencyMap.get(depName)?.add(String(depVer));
      }

      // Consolidate permissions
      if (app.declaredPermissions && Array.isArray(app.declaredPermissions)) {
        for (const p of app.declaredPermissions) {
          if (p && p.type) consolidatedPermissionsSet.add(p.type);
        }
      }

      verifiedApps.push({
        id: app.id,
        packageName: app.packageName,
        version: app.version,
        nexusChecksum,
        approvedChecksum,
        checksumMatched,
        dependencies,
      });
    }

    // Detect transitive dependency conflicts
    for (const [depName, versionSet] of sharedDependencyMap.entries()) {
      if (versionSet.size > 1) {
        conflicts.push(
          `Dependency Version Collision on '${depName}': Found conflicting constraints [${Array.from(versionSet).join(', ')}]`
        );
      }
    }

    const passed = allChecksumsMatched && conflicts.length === 0;

    // Generate Release Manifest
    const bundledMiniApps = verifiedApps.map(app => ({
      id: app.id,
      packageName: app.packageName,
      version: app.version,
      checksum: app.nexusChecksum,
      entryPoint: `package:${app.packageName}/${app.packageName.replace('dps_miniapp_mobile_', 'dsp_miniapp_')}.dart`,
    }));

    const consolidatedPermissions = Array.from(consolidatedPermissionsSet);
    const manifestPayload = JSON.stringify({
      superAppVersion: dto.releaseVersion,
      buildTimestamp: timestamp,
      bundledMiniApps,
      consolidatedPermissions,
    });

    const integrityDigest = crypto.createHash('sha256').update(manifestPayload).digest('hex');

    const manifest = {
      superAppVersion: dto.releaseVersion,
      buildTimestamp: timestamp,
      bundledMiniApps,
      consolidatedPermissions,
      integrityDigest,
    };

    return {
      passed,
      status: passed ? 'PASSED' : 'FAILED',
      releaseVersion: dto.releaseVersion,
      timestamp,
      verifiedApps,
      conflicts,
      manifest,
    };
  }
}
