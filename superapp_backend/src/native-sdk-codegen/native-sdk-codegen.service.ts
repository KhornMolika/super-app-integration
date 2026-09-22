import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { GitLabProvider } from '../integrations/git/providers/gitlab.provider';
import { GitlabMrService } from './gitlab-mr.service';
import { NativeSdkVendor } from './vendor.types';
import { replaceMarkedRegion } from './marker';
import {
  NATIVE_SDK_MARKED_REGIONS,
  NativeSdkTargetKey,
  REGION_DEPS,
  REGION_HANDLERS,
  REGION_IMPORTS,
  REGION_PODS,
  REGION_SOURCES,
  identifierFor,
  podspecUrlFor,
  renderAndroidHandlers,
  renderAndroidImports,
  renderGradleLines,
  renderGradleSources,
  renderIosHandlers,
  renderIosImports,
  renderPodfileLines,
  renderPodfileSources,
} from './renderers';

interface RegionEdit {
  target: NativeSdkTargetKey;
  region: string;
  body: string;
}

/** integrationConfig fields that must be non-empty strings for every vendor. */
const REQUIRED_CONFIG_FIELDS = [
  'iosModuleName',
  'iosTypeName',
  'androidPackageName',
  'androidObjectName',
  'androidMavenGroupId',
  'androidMavenArtifactId',
  'androidMavenVersion',
  'iosNexusZipUrl',
  'androidNexusMavenUrl',
] as const;

/** Mini-app statuses whose native SDK must stay wired into the mobile app. */
const LIVE_STATUSES = ['APPROVED', 'ACTIVE'];

const HEAD_TIMEOUT_MS = 10_000;

export interface RegenerateResult {
  /**
   * URL of the opened GitLab merge request (field name kept as `prUrl`, stored
   * as integrationConfig.codegenPrUrl, to avoid a data migration); undefined
   * when nothing changed or CODEGEN_AUTO_MR/CODEGEN_AUTO_PR is off.
   */
  prUrl?: string;
  /** Repo-relative path -> new content, only for files whose content changed. */
  changedFiles: Map<string, string>;
}

@Injectable()
export class NativeSdkCodegenService {
  private readonly logger = new Logger(NativeSdkCodegenService.name);

  /**
   * In-process queue tail. regenerate() runs are serialised so an older run
   * (which read the vendor set earlier) can never finish after a newer one and
   * close the newer, more complete MR as "superseded".
   * NOTE: this only protects a single instance; multi-instance deployments
   * need a DB advisory lock (e.g. pg_advisory_lock) around regenerate().
   */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
    private readonly configService: ConfigService,
    private readonly gitlabProvider: GitLabProvider,
    private readonly gitlabMrService: GitlabMrService,
  ) {}

  private repoSlug(): string {
    const slug = this.configService.get<string>('CODEGEN_REPO_SLUG');
    if (!slug) {
      throw new Error(
        'CODEGEN_REPO_SLUG must be set (GitLab group/project path)',
      );
    }
    return slug;
  }

  private baseBranch(): string {
    return this.configService.get<string>('CODEGEN_BASE_BRANCH') || 'main';
  }

  private nexusBaseUrl(): string {
    return (
      this.configService.get<string>('NEXUS_BASE_URL') ||
      'http://localhost:8081'
    ).replace(/\/+$/, '');
  }

  private nexusRepoUrl(envKey: string, fallback: string): string {
    return `${this.nexusBaseUrl()}/repository/${
      this.configService.get<string>(envKey) || fallback
    }/`;
  }

  /**
   * Every live NATIVE_SDK mini app (APPROVED, plus ACTIVE ones already shipped
   * — dropping those would strip their glue from the app). The app being
   * approved is included because the caller approves it before regenerating.
   *
   * Fail-loud policy: an app with an incomplete/invalid config aborts the run
   * with an error naming it. Skipping it would silently delete an already
   * shipped vendor's glue from the regenerated files.
   */
  async loadVendors(): Promise<NativeSdkVendor[]> {
    const apps = await this.miniappRepository.find({
      where: { integrationMethod: 'NATIVE_SDK', status: In(LIVE_STATUSES) },
      order: { appId: 'ASC' },
    });

    const cocoapodsSpecsUrl = this.nexusRepoUrl(
      'NEXUS_COCOAPODS_SPECS_REPO',
      'cocoapods-specs',
    );
    const mavenRepoUrl = this.nexusRepoUrl(
      'NEXUS_MAVEN_SDK_REPO',
      'maven-sdk-hosted',
    );

    const vendors = apps.map((app): NativeSdkVendor => {
      const config = app.integrationConfig;
      if (!config) {
        throw new Error(
          `NATIVE_SDK app "${app.appId}" has no integrationConfig set`,
        );
      }
      for (const field of REQUIRED_CONFIG_FIELDS) {
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
        iosNexusZipUrl: config.iosNexusZipUrl,
        cocoapodsSpecsUrl,
        androidPackageName: config.androidPackageName,
        androidObjectName: config.androidObjectName,
        androidMavenGroupId: config.androidMavenGroupId,
        androidMavenArtifactId: config.androidMavenArtifactId,
        androidMavenVersion: config.androidMavenVersion,
        androidNexusMavenUrl: config.androidNexusMavenUrl,
        mavenRepoUrl,
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

  /**
   * HEAD-checks every vendor artifact on Nexus. Only URLs under the configured
   * NEXUS_BASE_URL origin are contacted, and credentials are sent to that
   * origin only — a stored URL pointing anywhere else is rejected unprobed.
   */
  async verifyNexusArtifacts(vendors: NativeSdkVendor[]): Promise<void> {
    const nexusOrigin = new URL(this.nexusBaseUrl()).origin;
    const user = this.configService.get<string>('NEXUS_ADMIN_USER') || 'admin';
    const pass = this.configService.get<string>('NEXUS_ADMIN_PASSWORD');
    const headers: Record<string, string> = pass
      ? {
          Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
        }
      : {};

    const probes: Promise<string | null>[] = [];
    for (const vendor of vendors) {
      const artifacts: [string, string | undefined][] = [
        ['iOS zip', vendor.iosNexusZipUrl],
        ['Android AAR', vendor.androidNexusMavenUrl],
      ];
      // The podspec the Podfile pins via `:podspec =>`; only when an iOS zip is
      // configured (otherwise the zip probe already reports the problem).
      if (vendor.iosNexusZipUrl) {
        let podspecUrl: string | undefined;
        try {
          podspecUrl = podspecUrlFor(vendor);
        } catch {
          podspecUrl = undefined; // invalid config is reported by the renderers
        }
        if (podspecUrl) artifacts.push(['iOS podspec', podspecUrl]);
      }
      for (const [label, url] of artifacts) {
        probes.push(
          this.probe(`${vendor.appId} ${label}`, url, nexusOrigin, headers),
        );
      }
    }
    const problems = (await Promise.all(probes)).filter(
      (p): p is string => p !== null,
    );

    if (problems.length > 0) {
      throw new Error(
        `Nexus artifact verification failed:\n- ${problems.join('\n- ')}`,
      );
    }
  }

  /**
   * One HEAD probe; returns a problem description or null. Redirects are NOT
   * followed (a redirect could carry the credentials to another host), so a 3xx
   * counts as a failure.
   */
  private async probe(
    where: string,
    url: string | undefined,
    nexusOrigin: string,
    headers: Record<string, string>,
  ): Promise<string | null> {
    let parsed: URL;
    try {
      parsed = new URL(url ?? '');
    } catch {
      return `${where}: invalid URL ${JSON.stringify(url)}`;
    }
    if (parsed.origin !== nexusOrigin) {
      return `${where}: ${url} is not under the configured Nexus (${nexusOrigin})`;
    }
    try {
      const res = await fetch(url as string, {
        method: 'HEAD',
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
      });
      return res.ok ? null : `${where}: ${url} returned HTTP ${res.status}`;
    } catch (err: any) {
      return `${where}: ${url} unreachable (${err?.message ?? err})`;
    }
  }

  private editsFor(vendors: NativeSdkVendor[]): RegionEdit[] {
    return [
      {
        target: 'podfile',
        region: REGION_SOURCES,
        body: renderPodfileSources(vendors),
      },
      {
        target: 'podfile',
        region: REGION_PODS,
        body: renderPodfileLines(vendors),
      },
      {
        target: 'gradle',
        region: REGION_SOURCES,
        body: renderGradleSources(vendors),
      },
      {
        target: 'gradle',
        region: REGION_DEPS,
        body: renderGradleLines(vendors),
      },
      {
        target: 'appDelegate',
        region: REGION_IMPORTS,
        body: renderIosImports(vendors),
      },
      {
        target: 'appDelegate',
        region: REGION_HANDLERS,
        body: renderIosHandlers(vendors),
      },
      {
        target: 'mainActivity',
        region: REGION_IMPORTS,
        body: renderAndroidImports(vendors),
      },
      {
        target: 'mainActivity',
        region: REGION_HANDLERS,
        body: renderAndroidHandlers(vendors),
      },
    ];
  }

  /**
   * Re-renders the 8 generated regions against the current mobile-repo content
   * and opens a merge request with the files that changed. Never touches local disk.
   */
  regenerate(): Promise<RegenerateResult> {
    const run = this.queue.then(() => this.doRegenerate());
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async doRegenerate(): Promise<RegenerateResult> {
    const vendors = await this.loadVendors();
    const slug = this.repoSlug();
    const base = this.baseBranch();

    await this.verifyNexusArtifacts(vendors);

    // Read every file at one resolved SHA so contents and the MR's branch base agree.
    const baseSha = await this.gitlabProvider.resolveCommitSha(slug, base);

    const originalContent = new Map<string, string>();
    const workingContent = new Map<string, string>();

    for (const edit of this.editsFor(vendors)) {
      const relPath = NATIVE_SDK_MARKED_REGIONS[edit.target].path;
      if (!workingContent.has(relPath)) {
        const fetched = await this.gitlabProvider.getFileContent(
          slug,
          relPath,
          baseSha,
        );
        originalContent.set(relPath, fetched);
        workingContent.set(relPath, fetched);
      }
      workingContent.set(
        relPath,
        replaceMarkedRegion(
          workingContent.get(relPath)!,
          edit.region,
          edit.body,
        ),
      );
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

    const pr = await this.gitlabMrService.openMrForChanges(
      changedFiles,
      baseSha,
    );
    return { prUrl: pr.prUrl, changedFiles };
  }
}
