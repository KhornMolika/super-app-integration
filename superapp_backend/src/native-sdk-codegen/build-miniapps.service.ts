import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import {
  MiniAppDependency,
  miniAppDependencyOf,
} from '../integrations/flutter/miniapp-dependency.util';
import { renderMiniAppRegistry, RegistryEntry } from '../integrations/flutter/miniapp-registry.render';
import {
  SuperAppBuildType,
  buildExclusionReason,
  buildStagesFor,
} from './build-inclusion';

export interface BuildMiniAppPackage {
  appId: string;
  name: string;
  status: string;
  packageName: string;
  dependency: MiniAppDependency;
}

export interface BuildMiniApps {
  /** The pubspec.yaml mini app dependencies, one per package. */
  packages: BuildMiniAppPackage[];
  /** Apps that cannot be in the build, with the reason. */
  skipped: { appId: string; reason: string }[];
  /** Full content of lib/core/miniapp/mini_app_registry.generated.dart */
  registryDart: string;
}

/**
 * Which Flutter mini apps the Super App build includes, read from this
 * environment's database. The build (Jenkins, publish script) rewrites the
 * Super App's mini app dependencies and registry from it before `pub get`, so
 * an app deleted or added here is never left out of date in the super-app repo.
 * No secrets: private repositories get their keys from build-git-credentials.
 */
@Injectable()
export class BuildMiniAppsService {
  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
    private readonly config: ConfigService,
  ) {}

  /** `buildType`: which build reads the list (see build-inclusion.ts). */
  async plan(buildType: SuperAppBuildType = 'debug'): Promise<BuildMiniApps> {
    const apps = await this.miniappRepository.find({
      where: { integrationMethod: 'FLUTTER_PACKAGE', lifecycleStatus: In(buildStagesFor(buildType)) },
      order: { appId: 'ASC' },
    });
    const gateway = this.config.get<string>('SUPER_APP_PUB_URL');
    const packages: BuildMiniAppPackage[] = [];
    const skipped: { appId: string; reason: string }[] = [];
    const registry: RegistryEntry[] = [];
    const byPackage = new Map<string, string>();

    for (const app of apps) {
      const excluded = buildExclusionReason(app, buildType);
      if (excluded) {
        skipped.push({ appId: app.appId, reason: excluded });
        continue;
      }
      const r = miniAppDependencyOf(app, gateway);
      if ('skip' in r) {
        skipped.push({ appId: app.appId, reason: r.skip });
        continue;
      }
      const owner = byPackage.get(r.packageName);
      if (owner) {
        skipped.push({ appId: app.appId, reason: `package ${r.packageName} is already in the build for ${owner}` });
        continue;
      }
      byPackage.set(r.packageName, app.appId);
      packages.push({
        appId: app.appId,
        name: app.name,
        status: String(app.lifecycleStatus),
        packageName: r.packageName,
        dependency: r.dependency,
      });
      registry.push({ packageName: r.packageName, app });
    }

    return { packages, skipped, registryDart: renderMiniAppRegistry(registry) };
  }
}
