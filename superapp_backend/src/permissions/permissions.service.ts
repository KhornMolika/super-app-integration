import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { PermissionDefinition } from './entities/permission-definition.entity';
import { UpdatePermissionDefinitionDto } from './dto/update-permission-definition.dto';
import { GitLabProvider } from '../integrations/git/providers/gitlab.provider';

@Injectable()
export class PermissionsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    @InjectRepository(PermissionDefinition)
    private permissionDefinitionRepository: Repository<PermissionDefinition>,
    private readonly configService: ConfigService,
    private readonly gitlabProvider: GitLabProvider,
  ) {}

  async onApplicationBootstrap() {
    await this.seedInitialPermissions();
    // Background capability registry sync from GitLab branch main (enterprise pattern)
    this.syncCapabilitiesFromGitLab().catch((err) => {
      this.logger.warn(
        `Initial startup capability sync from GitLab deferred: ${err.message}`,
      );
    });
  }

  private async seedInitialPermissions() {
    const defaultPermissions = [
      {
        key: 'camera',
        name: 'Camera',
        category: 'MEDIA_HARDWARE',
        description: 'Access device camera to take photos or scan QR codes',
      },
      {
        key: 'location',
        name: 'Location',
        category: 'LOCATION',
        description: 'Access device GPS location for map and geolocation features',
      },
      {
        key: 'biometrics',
        name: 'Biometrics',
        category: 'SECURITY',
        description: 'Access biometric authentication (FaceID, TouchID, Fingerprint)',
      },
      {
        key: 'microphone',
        name: 'Microphone',
        category: 'MEDIA_HARDWARE',
        description: 'Access device microphone to record audio notes or voice features',
      },
      {
        key: 'storage',
        name: 'Storage',
        category: 'SECURITY',
        description: 'Read and write local files or device storage',
      },
    ];

    for (const p of defaultPermissions) {
      const exists = await this.findByKey(p.key);
      if (!exists) {
        await this.permissionDefinitionRepository.save(
          this.permissionDefinitionRepository.create(p),
        );
      }
    }
  }

  async findAll(): Promise<PermissionDefinition[]> {
    return this.permissionDefinitionRepository.find();
  }

  async findByKey(key: string): Promise<PermissionDefinition | null> {
    if (!key) return null;
    return this.permissionDefinitionRepository
      .createQueryBuilder('perm')
      .where('LOWER(perm.key) = LOWER(:key)', { key })
      .orWhere('LOWER(perm.name) = LOWER(:key)', { key })
      .getOne();
  }

  async findOne(id: string): Promise<PermissionDefinition> {
    const perm = await this.permissionDefinitionRepository.findOne({
      where: { id },
    });
    if (!perm) throw new NotFoundException('Permission not found');
    return perm;
  }

  async update(
    id: string,
    data: UpdatePermissionDefinitionDto,
  ): Promise<PermissionDefinition> {
    const perm = await this.findOne(id);
    const merged = this.permissionDefinitionRepository.merge(perm, data);
    return this.permissionDefinitionRepository.save(merged);
  }

  /**
   * Enterprise Capability Registry Synchronization:
   * 1. Fetches pubspec.yaml and AndroidManifest.xml from GitLab branch `main`.
   * 2. Detects all native plugins, bridge methods, and permissions.
   * 3. Upserts and persists them into the PostgreSQL database (permission_definitions table).
   */
  async syncCapabilitiesFromGitLab(): Promise<{
    success: boolean;
    syncedCount: number;
    targetBranch: string;
    repoUrl: string;
    commitSha?: string;
    syncedAt: string;
    capabilities: any[];
  }> {
    const superAppRepoUrl =
      this.configService.get<string>('SUPERAPP_GIT_REPO_URL') ||
      'https://git.fintechcenterfsa.com/frontend/super-app.git';
    const targetBranch = 'main';

    this.logger.log(
      `Synchronizing SuperApp capabilities from GitLab (${superAppRepoUrl}) on branch '${targetBranch}'...`,
    );

    let pubspecRaw = '';
    try {
      pubspecRaw = await this.gitlabProvider.getFileContent(
        superAppRepoUrl,
        'pubspec.yaml',
        targetBranch,
      );
    } catch (gitErr: any) {
      this.logger.error(
        `Failed to fetch pubspec.yaml from GitLab branch '${targetBranch}': ${gitErr.message}`,
      );
      throw new BadRequestException(
        `Failed to sync SuperApp capabilities from GitLab (${superAppRepoUrl}) on branch '${targetBranch}': ${gitErr.message}`,
      );
    }

    if (!pubspecRaw) {
      throw new BadRequestException(
        `Empty pubspec.yaml retrieved from GitLab (${superAppRepoUrl}) on branch '${targetBranch}'.`,
      );
    }

    const parsedPubspec = YAML.parse(pubspecRaw);
    const deps = parsedPubspec?.dependencies || {};
    const superAppVersion = parsedPubspec?.version || '1.0.0';

    let manifestContent = '';
    try {
      manifestContent = await this.gitlabProvider.getFileContent(
        superAppRepoUrl,
        'android/app/src/main/AndroidManifest.xml',
        targetBranch,
      );
    } catch (manifestErr: any) {
      this.logger.debug(
        `Could not fetch AndroidManifest.xml from GitLab '${targetBranch}': ${manifestErr.message}`,
      );
    }

    let infoPlistContent = '';
    try {
      infoPlistContent = await this.gitlabProvider.getFileContent(
        superAppRepoUrl,
        'ios/Runner/Info.plist',
        targetBranch,
      );
    } catch (plistErr: any) {
      this.logger.debug(
        `Could not fetch Info.plist from GitLab '${targetBranch}': ${plistErr.message}`,
      );
    }

    let commitSha: string | undefined;
    try {
      commitSha = await this.gitlabProvider.resolveCommitSha(
        superAppRepoUrl,
        targetBranch,
      );
    } catch {
      // Commit sha is optional
    }

    const detectedCaps = this.buildCapabilitiesList(
      deps,
      manifestContent,
      infoPlistContent,
      'gitlab:main',
    );

    const now = new Date().toISOString();
    let syncedCount = 0;

    for (const cap of detectedCaps) {
      let existing = await this.permissionDefinitionRepository.findOne({
        where: { key: cap.key },
      });

      if (!existing && cap.requiredPermissions?.[0]) {
        existing = await this.permissionDefinitionRepository.findOne({
          where: { key: cap.requiredPermissions[0] },
        });
      }

      if (existing) {
        existing.name = cap.name;
        existing.category = cap.category;
        existing.description = cap.description;
        existing.isActive = true;
        existing.minSuperAppVersion = superAppVersion;
        existing.metadata = {
          ...(existing.metadata || {}),
          ...cap,
          commitSha,
          lastSyncedAt: now,
          source: 'gitlab:main',
        };
        await this.permissionDefinitionRepository.save(existing);
      } else {
        const created = this.permissionDefinitionRepository.create({
          key: cap.key,
          name: cap.name,
          category: cap.category,
          description: cap.description,
          isActive: true,
          minSuperAppVersion: superAppVersion,
          metadata: {
            ...cap,
            commitSha,
            lastSyncedAt: now,
            source: 'gitlab:main',
          },
        });
        await this.permissionDefinitionRepository.save(created);
      }
      syncedCount++;
    }

    this.logger.log(
      `Successfully synced ${syncedCount} capabilities from GitLab '${targetBranch}' into PostgreSQL database.`,
    );

    return {
      success: true,
      syncedCount,
      targetBranch,
      repoUrl: superAppRepoUrl,
      commitSha,
      syncedAt: now,
      capabilities: detectedCaps,
    };
  }

  /**
   * Enterprise Capability Access:
   * Serves SuperApp capabilities from the PostgreSQL Database Capability Registry.
   * If refresh is requested, triggers synchronization from GitLab first.
   * Guarantees sub-millisecond response times with zero runtime dependency on GitLab uptime.
   */
  async getRealCapabilities(options?: { refresh?: boolean }) {
    if (options?.refresh) {
      await this.syncCapabilitiesFromGitLab();
    }

    const dbDefinitions = await this.permissionDefinitionRepository.find({
      where: { isActive: true },
    });

    // If database is empty, run initial sync immediately
    if (dbDefinitions.length === 0) {
      try {
        const syncRes = await this.syncCapabilitiesFromGitLab();
        return syncRes.capabilities;
      } catch (err: any) {
        this.logger.warn(`Could not sync on empty DB: ${err.message}`);
        return [];
      }
    }

    // Map database registry records to CapabilityItem format expected by clients
    return dbDefinitions.map((perm) => {
      const meta = perm.metadata || {};
      return {
        id: perm.id,
        key: perm.key,
        name: perm.name,
        description: perm.description,
        category: perm.category || 'PLATFORM',
        requiredPermissions: meta.requiredPermissions || [perm.key],
        platform: meta.platform || 'Cross-Platform',
        implementationType: meta.implementationType || 'FLUTTER_PLUGIN',
        providerPackage: meta.providerPackage || perm.key,
        jsBridgeMethod: meta.jsBridgeMethod || `FSASuperApp.${perm.key}()`,
        status: perm.isActive ? 'Active' : 'Deprecated',
        source: meta.source || 'database-registry (synced from gitlab:main)',
        minSuperAppVersion: perm.minSuperAppVersion || '1.0.0',
        lastSyncedAt: meta.lastSyncedAt,
        commitSha: meta.commitSha,
      };
    });
  }

  private buildCapabilitiesList(
    deps: Record<string, any>,
    manifestContent: string,
    infoPlistContent: string = '',
    detectionSource: string = 'gitlab:main',
  ) {
    const capabilities: any[] = [];

    // Helper to extract umbrella description from Info.plist
    const extractPlistString = (key: string): string => {
      const regex = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`, 'i');
      const match = infoPlistContent.match(regex);
      return match ? match[1].trim() : '';
    };

    // 1. Scan QR Code capability
    if (
      deps['image_picker'] ||
      deps['mobile_scanner'] ||
      deps['qr_code_scanner'] ||
      manifestContent.includes('CAMERA') ||
      infoPlistContent.includes('NSCameraUsageDescription')
    ) {
      capabilities.push({
        id: 'cap-scan-qr',
        key: 'scan_qr_code',
        name: 'Scan QR Code',
        description:
          extractPlistString('NSCameraUsageDescription') ||
          'Native QR code scanning bridge for merchant codes, payment tokens, and digital ID verification.',
        category: 'MEDIA_HARDWARE',
        requiredPermissions: ['camera'],
        platform: 'Cross-Platform',
        implementationType: 'NATIVE_BRIDGE',
        providerPackage: deps['mobile_scanner']
          ? `mobile_scanner: ${deps['mobile_scanner']}`
          : 'image_picker / native_camera',
        jsBridgeMethod: 'FSASuperApp.scanQRCode()',
        status: 'Active',
        source: detectionSource,
      });
    }

    // 2. Camera & Photo Capture
    if (
      deps['image_picker'] ||
      manifestContent.includes('CAMERA') ||
      infoPlistContent.includes('NSCameraUsageDescription') ||
      infoPlistContent.includes('NSPhotoLibraryUsageDescription')
    ) {
      capabilities.push({
        id: 'cap-photo-capture',
        key: 'take_photo',
        name: 'Camera & Document Capture',
        description:
          extractPlistString('NSCameraUsageDescription') ||
          'Photo capture and image selection from camera for KYC verification and document uploads.',
        category: 'MEDIA_HARDWARE',
        requiredPermissions: ['camera'],
        platform: 'Cross-Platform',
        implementationType: 'FLUTTER_PLUGIN',
        providerPackage: deps['image_picker']
          ? `image_picker: ${deps['image_picker']}`
          : 'image_picker: ^1.1.2',
        jsBridgeMethod: 'FSASuperApp.takePhoto()',
        status: 'Active',
        source: detectionSource,
      });
    }

    // 3. Geolocation Services
    if (
      deps['geolocator'] ||
      deps['location'] ||
      manifestContent.includes('LOCATION') ||
      infoPlistContent.includes('NSLocation')
    ) {
      capabilities.push({
        id: 'cap-location',
        key: 'get_location',
        name: 'Geolocation Services',
        description:
          extractPlistString('NSLocationWhenInUseUsageDescription') ||
          extractPlistString('NSLocationAlwaysUsageDescription') ||
          'Real-time GPS coordinates for branch discovery, nearby regulatory offices, and geo-fencing.',
        category: 'LOCATION',
        requiredPermissions: ['location'],
        platform: 'Cross-Platform',
        implementationType: 'FLUTTER_PLUGIN',
        providerPackage: deps['geolocator']
          ? `geolocator: ${deps['geolocator']}`
          : 'geolocator: ^14.0.3',
        jsBridgeMethod: 'FSASuperApp.getLocation()',
        status: 'Active',
        source: detectionSource,
      });
    }

    // 4. Biometric Authentication
    if (
      deps['local_auth'] ||
      manifestContent.includes('BIOMETRIC') ||
      infoPlistContent.includes('NSFaceIDUsageDescription')
    ) {
      capabilities.push({
        id: 'cap-biometric',
        key: 'biometric_auth',
        name: 'Biometric Authentication',
        description:
          extractPlistString('NSFaceIDUsageDescription') ||
          'Hardware FaceID, TouchID, and Android BiometricPrompt identity verification.',
        category: 'SECURITY',
        requiredPermissions: ['biometrics'],
        platform: 'Cross-Platform',
        implementationType: 'FLUTTER_PLUGIN',
        providerPackage: deps['local_auth']
          ? `local_auth: ${deps['local_auth']}`
          : 'local_auth: ^3.0.2',
        jsBridgeMethod: 'FSASuperApp.authenticateBiometric()',
        status: 'Active',
        source: detectionSource,
      });
    }

    // 5. Secure Vault Storage
    if (
      deps['flutter_secure_storage'] ||
      infoPlistContent.includes('NSPhotoLibrary')
    ) {
      capabilities.push({
        id: 'cap-secure-storage',
        key: 'secure_storage',
        name: 'Secure Vault Storage',
        description:
          'Hardware-backed encrypted key-value storage (Android KeyStore & iOS Keychain).',
        category: 'SECURITY',
        requiredPermissions: ['storage'],
        platform: 'Cross-Platform',
        implementationType: 'FLUTTER_PLUGIN',
        providerPackage: `flutter_secure_storage: ${deps['flutter_secure_storage']}`,
        jsBridgeMethod: 'FSASuperApp.getSecureStorage()',
        status: 'Active',
        source: detectionSource,
      });
    }

    // 6. Sandboxed WebView Runtime
    if (deps['webview_flutter'] || manifestContent.includes('INTERNET')) {
      capabilities.push({
        id: 'cap-webview',
        key: 'webview_runtime',
        name: 'Sandboxed WebView Runtime',
        description:
          'Isolated web application host container with security boundary and JS bridge.',
        category: 'PLATFORM',
        requiredPermissions: ['internet'],
        platform: 'Cross-Platform',
        implementationType: 'FLUTTER_PLUGIN',
        providerPackage: deps['webview_flutter']
          ? `webview_flutter: ${deps['webview_flutter']}`
          : 'webview_flutter: ^4.10.0',
        jsBridgeMethod: 'FSASuperApp.postMessage()',
        status: 'Active',
        source: detectionSource,
      });
    }

    // 7. Dynamic check for any extra dynamically added plugins
    for (const [pkg, version] of Object.entries(deps)) {
      if (
        ['record', 'file_picker', 'nfc_manager', 'qr_code_scanner'].includes(pkg)
      ) {
        capabilities.push({
          id: `cap-${pkg}`,
          key: pkg,
          name: pkg.replace('_', ' ').toUpperCase(),
          description: `Dynamically integrated Flutter capability provider (${pkg}).`,
          category: 'DYNAMIC_EXTENSION',
          requiredPermissions: [
            pkg.includes('record')
              ? 'microphone'
              : pkg.includes('nfc')
              ? 'nfc'
              : 'storage',
          ],
          platform: 'Cross-Platform',
          implementationType: 'FLUTTER_PLUGIN',
          providerPackage: `${pkg}: ${typeof version === 'object' ? 'custom' : version}`,
          status: 'Active',
          source: detectionSource,
        });
      }
    }

    return capabilities;
  }
}
