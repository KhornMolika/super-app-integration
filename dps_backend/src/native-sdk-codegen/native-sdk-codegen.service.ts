import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { GitHubProvider } from '../integrations/git/providers/github.provider';
import { NativeSdkVendor } from './vendor.types';
import { replaceMarkedRegion } from './marker';
import {
  renderIosImports,
  renderIosHandlers,
  renderAndroidImports,
  renderAndroidHandlers,
  renderPodfileLines,
  renderGradleLines,
  identifierFor,
} from './renderers';

interface RegionEdit {
  relPath: string;
  region: string;
  body: string;
}

/** Every field the renderers emit into real source; all must be present strings. */
const REQUIRED_VENDOR_FIELDS: (keyof NativeSdkVendor)[] = [
  'iosModuleName',
  'iosTypeName',
  'iosArtifactFilename',
  'androidPackageName',
  'androidObjectName',
  'androidArtifactFilename',
];

const IOS_APP_DELEGATE = 'dps_mobile_app/ios/Runner/AppDelegate.swift';
const ANDROID_MAIN_ACTIVITY =
  'dps_mobile_app/android/app/src/main/kotlin/com/example/dsp_mobile/MainActivity.kt';
const IOS_PODFILE = 'dps_mobile_app/ios/Podfile';
const ANDROID_GRADLE = 'dps_mobile_app/android/app/build.gradle.kts';

@Injectable()
export class NativeSdkCodegenService {
  private readonly logger = new Logger(NativeSdkCodegenService.name);

  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
    private readonly configService: ConfigService,
    private readonly githubProvider: GitHubProvider,
  ) {}

  private repoSlug(): string {
    const slug = this.configService.get<string>('CODEGEN_REPO_SLUG');
    if (!slug) {
      throw new Error('CODEGEN_REPO_SLUG must be set (owner/repo)');
    }
    return slug;
  }

  private baseBranch(): string {
    return this.configService.get<string>('CODEGEN_BASE_BRANCH') || 'main';
  }

  async loadVendors(): Promise<NativeSdkVendor[]> {
    const apps = await this.miniappRepository.find({
      where: { integrationMethod: 'NATIVE_SDK', status: 'APPROVED' } as any,
      order: { appId: 'ASC' } as any,
    });

    const vendors = apps
      .filter(app => app.integrationConfig)
      .map(app => {
        const config = app.integrationConfig;
        for (const field of REQUIRED_VENDOR_FIELDS) {
          const value = config[field];
          if (typeof value !== 'string' || value.trim() === '') {
            throw new Error(
              `NATIVE_SDK app "${app.appId}" has an invalid integrationConfig: "${field}" must be a non-empty string`,
            );
          }
        }
        return {
          appId: app.appId,
          iosModuleName: config.iosModuleName,
          iosTypeName: config.iosTypeName,
          iosArtifactFilename: config.iosArtifactFilename,
          androidPackageName: config.androidPackageName,
          androidObjectName: config.androidObjectName,
          androidArtifactFilename: config.androidArtifactFilename,
        };
      });

    const byIdentifier = new Map<string, string>();
    for (const vendor of vendors) {
      const id = identifierFor(vendor.appId);
      const existing = byIdentifier.get(id);
      if (existing !== undefined) {
        throw new Error(
          `NATIVE_SDK appIds "${existing}" and "${vendor.appId}" both generate the identifier "${id}"; rename one of them`,
        );
      }
      byIdentifier.set(id, vendor.appId);
    }

    return vendors;
  }

  private editsFor(vendors: NativeSdkVendor[]): RegionEdit[] {
    return [
      { relPath: IOS_APP_DELEGATE, region: 'IMPORTS', body: renderIosImports(vendors) },
      { relPath: IOS_APP_DELEGATE, region: 'HANDLERS', body: renderIosHandlers(vendors) },
      { relPath: ANDROID_MAIN_ACTIVITY, region: 'IMPORTS', body: renderAndroidImports(vendors) },
      { relPath: ANDROID_MAIN_ACTIVITY, region: 'HANDLERS', body: renderAndroidHandlers(vendors) },
      { relPath: IOS_PODFILE, region: 'PODS', body: renderPodfileLines(vendors) },
      { relPath: ANDROID_GRADLE, region: 'DEPS', body: renderGradleLines(vendors) },
    ];
  }

  /**
   * Re-renders every generated region against the current GitHub repo content
   * and returns only the files whose content actually changed. Never writes
   * to disk and never runs a local git command.
   */
  async regenerate(): Promise<{ changedFiles: Map<string, string> }> {
    const vendors = await this.loadVendors();
    const slug = this.repoSlug();
    const base = this.baseBranch();

    for (const vendor of vendors) {
      for (const artifact of [vendor.iosArtifactFilename, vendor.androidArtifactFilename]) {
        const artifactPath = `vendor-artifacts/${artifact}`;
        try {
          await this.githubProvider.getFileContent(slug, artifactPath, base);
        } catch {
          throw new Error(
            `Missing artifact for "${vendor.appId}" in ${slug}@${base}: ${artifactPath}`,
          );
        }
      }
    }

    const originalContent = new Map<string, string>();
    const workingContent = new Map<string, string>();

    for (const edit of this.editsFor(vendors)) {
      if (!workingContent.has(edit.relPath)) {
        const fetched = await this.githubProvider.getFileContent(slug, edit.relPath, base);
        originalContent.set(edit.relPath, fetched);
        workingContent.set(edit.relPath, fetched);
      }
      const current = workingContent.get(edit.relPath)!;
      workingContent.set(edit.relPath, replaceMarkedRegion(current, edit.region, edit.body));
    }

    const changedFiles = new Map<string, string>();
    for (const [relPath, next] of workingContent) {
      if (originalContent.get(relPath) !== next) {
        changedFiles.set(relPath, next);
      }
    }

    this.logger.log(
      `Regenerated ${vendors.length} native SDK vendor(s); ${changedFiles.size} file(s) changed`,
    );
    return { changedFiles };
  }
}
