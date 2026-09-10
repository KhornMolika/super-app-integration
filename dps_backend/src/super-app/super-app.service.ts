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
        version: 'v2.4.0',
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
      {
        version: 'v2.0.0',
        platform: 'ALL',
        capabilities: [
          'camera',
          'location',
          'storage',
          'microphone',
          'biometrics',
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
      superAppVersion: latest?.superAppVersion || 'v2.4.0',
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
