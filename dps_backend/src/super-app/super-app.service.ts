import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { SuperAppCapability } from './entities/super-app-capability.entity';

@Injectable()
export class SuperAppService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(SuperAppCapability)
    private superAppCapabilityRepository: Repository<SuperAppCapability>,
    private configService: ConfigService,
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
   * Computes the next version tag using single-digit 3-octet rollover (0-9 per position)
   * Example sequence: v0.0.8 -> v0.0.9 -> v0.1.0 -> v0.1.1 -> ... -> v0.9.9 -> v1.0.0
   */
  computeNextVersion(currentVer?: string): string {
    if (!currentVer) return 'v0.0.1';
    const match = currentVer.match(/^v?(\d+)\.(\d+)\.(\d+)/);
    if (!match) return 'v0.0.1';

    let major = parseInt(match[1], 10) || 0;
    let minor = parseInt(match[2], 10) || 0;
    let patch = parseInt(match[3], 10) || 0;

    patch += 1;
    if (patch > 9) {
      minor += Math.floor(patch / 10);
      patch = patch % 10;
    }
    if (minor > 9) {
      major += Math.floor(minor / 10);
      minor = minor % 10;
    }

    return `v${major}.${minor}.${patch}`;
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
    const nextVersion = this.computeNextVersion(currentVer);

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
    return this.computeNextVersion(currentVer);
  }

  getOfficialReleaseVersion(): string {
    try {
      const releaseManifestPath = path.resolve(
        process.cwd(),
        '../dps_mobile_app/super_app_release.json',
      );
      if (fs.existsSync(releaseManifestPath)) {
        const raw = fs.readFileSync(releaseManifestPath, 'utf-8');
        const json = JSON.parse(raw);
        if (json.superAppVersion) {
          return json.superAppVersion.startsWith('v')
            ? json.superAppVersion
            : `v${json.superAppVersion}`;
        }
      }
    } catch (_) {}
    return 'v1.0.0';
  }

  async getEcosystemStatus(): Promise<any> {
    const latest = await this.findLatestCapability();
    const testVersion = latest?.superAppVersion || 'v0.1.0';
    const officialVersion = this.getOfficialReleaseVersion();
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

    const nexusUrl =
      this.configService.get<string>('NEXUS_BASE_URL') ||
      this.configService.get<string>('NEXUS_URL') ||
      'http://localhost:8081';
    const jenkinsUrl =
      this.configService.get<string>('JENKINS_URL') || 'http://localhost:8085';
    const minioEndpoint = `${this.configService.get<string>('MINIO_ENDPOINT', 'localhost')}:${this.configService.get<string>('MINIO_PORT', '9000')}`;
    const minioPublicUrl =
      this.configService.get<string>('MINIO_PUBLIC_URL') ||
      `http://${minioEndpoint}`;
    const telegramBotUsername = this.configService.get<string>(
      'TELEGRAM_BOT_USERNAME',
      'superapp_notification_bot',
    );

    return {
      superAppVersion: testVersion,
      superAppTestVersion: testVersion,
      officialReleaseVersion: officialVersion,
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
      integratedServices: {
        telegramBot: {
          name: 'Telegram Bot Gateway',
          username: telegramBotUsername,
          url: `https://t.me/${telegramBotUsername}`,
          status: 'ONLINE',
        },
        nexusRegistry: {
          name: 'Sonatype Nexus Registry',
          url: nexusUrl,
          status: 'ONLINE',
        },
        jenkinsCiCd: {
          name: 'Jenkins CI/CD Automation',
          url: jenkinsUrl,
          status: 'ONLINE',
        },
        minioStorage: {
          name: 'MinIO AIStor Object Storage',
          url: minioPublicUrl,
          endpoint: minioEndpoint,
          status: 'ONLINE',
        },
      },
    };
  }
}
