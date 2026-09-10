import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuperAppCapability } from './entities/super-app-capability.entity';

@Injectable()
export class SuperAppService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(SuperAppCapability)
    private superAppCapabilityRepository: Repository<SuperAppCapability>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedInitialCapabilities();
  }

  private async seedInitialCapabilities() {
    const versions = [
      {
        version: 'v0.0.1',
        platform: 'ALL',
        capabilities: [
          'camera',
          'location',
          'biometrics',
          'microphone',
          'nfc',
          'bluetooth',
          'contacts',
          'storage',
        ],
      },
    ];

    for (const item of versions) {
      const exists = await this.superAppCapabilityRepository.findOne({
        where: { superAppVersion: item.version },
      });
      if (!exists) {
        await this.superAppCapabilityRepository.save({
          superAppVersion: item.version,
          platform: item.platform,
          capabilities: item.capabilities,
        });
      }
    }
  }

  async findAllCapabilities(): Promise<SuperAppCapability[]> {
    return this.superAppCapabilityRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findCapabilitiesForVersion(
    version: string,
  ): Promise<SuperAppCapability[]> {
    return this.superAppCapabilityRepository.find({
      where: { superAppVersion: version },
    });
  }

  async findLatestCapability(): Promise<SuperAppCapability | null> {
    const list = await this.superAppCapabilityRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
    return list[0] || null;
  }

  /**
   * Generates and persists the next incremented Super App release / test build version (starting from v0.0.1)
   */
  async getAndRegisterNextVersion(targetVersion?: string): Promise<string> {
    const latest = await this.findLatestCapability();
    const capabilities = latest?.capabilities || [
      'camera',
      'location',
      'storage',
      'microphone',
      'biometrics',
      'nfc',
      'bluetooth',
    ];

    if (targetVersion && /^v?\d+\.\d+(\.\d+)?/.test(targetVersion)) {
      const formatted = targetVersion.startsWith('v')
        ? targetVersion
        : `v${targetVersion}`;

      const exists = await this.superAppCapabilityRepository.findOne({
        where: { superAppVersion: formatted },
      });
      if (!exists) {
        await this.superAppCapabilityRepository.save({
          superAppVersion: formatted,
          platform: 'ALL',
          capabilities,
        });
      }
      return formatted;
    }

    if (!latest) {
      const initialVer = 'v0.0.1';
      await this.superAppCapabilityRepository.save({
        superAppVersion: initialVer,
        platform: 'ALL',
        capabilities,
      });
      return initialVer;
    }

    const currentVer = latest.superAppVersion || 'v0.0.1';
    const match = currentVer.match(/^v?(\d+)\.(\d+)\.(\d+)(.*)$/);
    let nextVersion = 'v0.0.1';

    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      const patch = parseInt(match[3], 10) + 1;
      nextVersion = `v${major}.${minor}.${patch}`;
    }

    // Persist new version to advance sequence
    await this.superAppCapabilityRepository.save({
      superAppVersion: nextVersion,
      platform: 'ALL',
      capabilities,
    });

    return nextVersion;
  }

  /**
   * Preview the next suggested version tag without immediately saving
   */
  async getNextSuggestedVersion(): Promise<string> {
    const latest = await this.findLatestCapability();
    if (!latest) return 'v0.0.1';
    const currentVer = latest.superAppVersion || 'v0.0.1';
    const match = currentVer.match(/^v?(\d+)\.(\d+)\.(\d+)(.*)$/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      const patch = parseInt(match[3], 10) + 1;
      return `v${major}.${minor}.${patch}`;
    }
    return 'v0.0.1';
  }

  async getEcosystemStatus(): Promise<any> {
    const latest = await this.findLatestCapability();
    const capabilities = latest ? latest.capabilities : [
      'camera',
      'location',
      'biometrics',
      'microphone',
      'nfc',
      'bluetooth',
      'contacts',
      'storage',
    ];

    return {
      superAppVersion: latest?.superAppVersion || 'v0.0.1',
      kernelStatus: 'OPERATIONAL',
      bridgeProtocolVersion: '2.0.0',
      securityGateEnforcement: 'STRICT',
      supportedPlatforms: ['iOS 15+', 'Android 10+', 'Flutter Web 3.x'],
      activeSecurityChecks: [
        'domain_tls_audit',
        'csp_headers_audit',
        'dast_zap',
        'secret_scan',
        'sast',
        'dependency_scan',
        'capability_gate',
        'sbom',
      ],
      capabilities,
      storageEngine: 'MinIO AIStor Enterprise S3',
      containerSandbox: 'Wasm / Iframe Web Sandbox & Dart AST Isolate Sandbox',
    };
  }
}
