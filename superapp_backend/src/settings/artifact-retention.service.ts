import {
  Injectable,
  Logger,
  OnModuleInit,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

export interface ArtifactRetentionPolicy {
  enabled: boolean;
  scheduleType: 'recurring' | 'specific_datetime';
  scheduleTime: string; // HH:mm format (e.g. "02:00")
  frequency: 'daily' | 'weekly';
  weeklyDay: number; // 0 = Sunday, 1 = Monday, ...
  specificRunDateTime: string | null; // ISO string for 1-time scheduled target
  retentionDays: number; // e.g. 14 days
  maxTestBuildsPerApp: number; // e.g. 3 (Dual protection: keep at least 3 latest builds)
  pruneSuperAppTestBuilds: boolean; // apk-test-builds/superapp/*
  pruneMiniAppArtifacts: boolean; // Stale package uploads
  lastRunAt?: string | null;
  lastFreedBytes?: number;
  lastPrunedCount?: number;
}

export const DEFAULT_RETENTION_POLICY: ArtifactRetentionPolicy = {
  enabled: true,
  scheduleType: 'recurring',
  scheduleTime: '02:00',
  frequency: 'daily',
  weeklyDay: 0,
  specificRunDateTime: null,
  retentionDays: 14,
  maxTestBuildsPerApp: 3,
  pruneSuperAppTestBuilds: true,
  pruneMiniAppArtifacts: true,
  lastRunAt: null,
  lastFreedBytes: 0,
  lastPrunedCount: 0,
};

export interface StorageOverviewStats {
  nexusTestBuildsCount: number;
  nexusTestBuildsSizeMb: number;
  nexusReleasesCount: number;
  nexusReleasesSizeMb: number;
  protectedReleaseCount: number;
  estimatedPrunableMb: number;
  estimatedPrunableCount: number;
  lastRunAt: string | null;
  lastFreedBytes: number;
  nextScheduledRun: string | null;
}

@Injectable()
export class ArtifactRetentionService implements OnModuleInit {
  private readonly logger = new Logger(ArtifactRetentionService.name);
  private cachedPolicy: ArtifactRetentionPolicy = {
    ...DEFAULT_RETENTION_POLICY,
  };
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.loadPolicy();
    this.startScheduleChecker();
  }

  async getPolicy(): Promise<ArtifactRetentionPolicy> {
    if (!this.cachedPolicy) {
      await this.loadPolicy();
    }
    return this.cachedPolicy;
  }

  async updatePolicy(
    updates: Partial<ArtifactRetentionPolicy>,
  ): Promise<ArtifactRetentionPolicy> {
    const current = await this.getPolicy();
    const updated: ArtifactRetentionPolicy = {
      ...current,
      ...updates,
    };

    await this.settingsRepo.save({
      key: 'artifact_retention_policy',
      value: updated,
      description:
        'Automated test build APK retention and storage pruning policy',
      updatedAt: new Date(),
    });

    this.cachedPolicy = updated;
    this.logger.log(
      `Artifact retention policy updated: schedule=${updated.scheduleType}, time=${updated.scheduleTime}, retentionDays=${updated.retentionDays}d, keepLast=${updated.maxTestBuildsPerApp}`,
    );

    // If specific datetime is set and already reached/passed, execute immediately
    if (
      updated.enabled &&
      updated.scheduleType === 'specific_datetime' &&
      updated.specificRunDateTime
    ) {
      const targetTime = new Date(updated.specificRunDateTime).getTime();
      if (Date.now() >= targetTime) {
        this.checkAndExecuteScheduledRun().catch((err) => {
          this.logger.error(
            `Error in immediate execution of scheduled retention: ${err.message}`,
          );
        });
      }
    }

    return updated;
  }

  private async loadPolicy() {
    try {
      const stored = await this.settingsRepo.findOne({
        where: { key: 'artifact_retention_policy' },
      });
      if (stored && stored.value) {
        this.cachedPolicy = { ...DEFAULT_RETENTION_POLICY, ...stored.value };
      } else {
        this.cachedPolicy = { ...DEFAULT_RETENTION_POLICY };
        await this.settingsRepo.save({
          key: 'artifact_retention_policy',
          value: DEFAULT_RETENTION_POLICY,
          description:
            'Automated test build APK retention and storage pruning policy',
        });
      }
    } catch (err: any) {
      this.logger.warn(
        `Could not load retention policy from DB: ${err.message}. Using default.`,
      );
      this.cachedPolicy = { ...DEFAULT_RETENTION_POLICY };
    }
  }

  private startScheduleChecker() {
    // Check every 30 seconds against policy schedule
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    this.intervalTimer = setInterval(() => {
      this.checkAndExecuteScheduledRun().catch((err) => {
        this.logger.error(
          `Error in scheduled artifact retention checker: ${err.message}`,
        );
      });
    }, 30 * 1000);
  }

  private async checkAndExecuteScheduledRun() {
    const policy = await this.getPolicy();
    if (!policy.enabled) return;

    const now = new Date();
    const nowHour = String(now.getHours()).padStart(2, '0');
    const nowMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${nowHour}:${nowMinute}`;

    if (
      policy.scheduleType === 'specific_datetime' &&
      policy.specificRunDateTime
    ) {
      const targetTime = new Date(policy.specificRunDateTime).getTime();
      if (now.getTime() >= targetTime) {
        this.logger.log(
          `Target execution datetime ${policy.specificRunDateTime} reached or passed. Triggering scheduled cleanup...`,
        );
        await this.executePruning('SCHEDULED_SPECIFIC_DATETIME');
        // Reset specific datetime to prevent repeating
        await this.updatePolicy({
          specificRunDateTime: null,
          scheduleType: 'recurring',
        });
      }
    } else if (policy.scheduleType === 'recurring') {
      if (currentTimeStr === policy.scheduleTime) {
        if (
          policy.frequency === 'weekly' &&
          now.getDay() !== policy.weeklyDay
        ) {
          return; // Not the scheduled day of week
        }

        // Avoid running multiple times within the same minute
        if (policy.lastRunAt) {
          const lastRun = new Date(policy.lastRunAt);
          if (now.getTime() - lastRun.getTime() < 55 * 60 * 1000) {
            return;
          }
        }

        this.logger.log(
          `Triggering recurring scheduled artifact cleanup at ${currentTimeStr}...`,
        );
        await this.executePruning('SCHEDULED_RECURRING');
      }
    }
  }

  private getNexusAuthHeader(): Record<string, string> {
    const user = this.configService.get<string>('NEXUS_ADMIN_USER', 'admin');
    const pass = this.configService.get<string>('NEXUS_ADMIN_PASSWORD');
    if (!pass) {
      throw new Error(
        'NEXUS_ADMIN_PASSWORD is not set; refusing to call Nexus with a default password',
      );
    }
    const b64 = Buffer.from(`${user}:${pass}`).toString('base64');
    return { Authorization: `Basic ${b64}`, Accept: 'application/json' };
  }

  private workingNexusBaseUrl: string | null = null;

  private async getNexusBaseUrl(): Promise<string> {
    if (this.workingNexusBaseUrl) return this.workingNexusBaseUrl;

    const configured = this.configService.get<string>('NEXUS_BASE_URL');
    const candidates = [
      this.configService.get<string>('NEXUS_INTERNAL_URL'),
      configured,
      'https://app.fintechcenterfsa.com/nexus',
      'http://10.200.8.6:8081',
      'http://super-app-nexus-svc.super-app.svc.cluster.local:8081/nexus',
      'http://super-app-nexus-svc.super-app.svc.cluster.local:8081',
      'http://nexus:8081',
      'http://localhost:8081',
    ].filter(Boolean) as string[];

    let authHeaders: Record<string, string> = {};
    try {
      authHeaders = this.getNexusAuthHeader();
    } catch {
      // password might not be set yet
    }

    for (const rawUrl of candidates) {
      const url = rawUrl.replace(/\/+$/, '');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${url}/service/rest/v1/status`, {
          headers: authHeaders,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok || res.status === 200 || res.status === 401) {
          this.workingNexusBaseUrl = url;
          return url;
        }
      } catch (_) {}
    }

    const fallback = (candidates[0] || 'http://localhost:8081').replace(/\/+$/, '');
    this.workingNexusBaseUrl = fallback;
    return fallback;
  }

  /**
   * Fetches all assets for a given repository from Nexus, following continuation tokens.
   */
  async fetchAllRepositoryAssets(
    baseUrl: string,
    repository: string,
    authHeaders: Record<string, string>,
  ): Promise<any[]> {
    const allItems: any[] = [];
    let continuationToken: string | null = null;
    let pageCount = 0;
    const maxPages = 50;

    do {
      pageCount++;
      const url = new URL(`${baseUrl}/service/rest/v1/assets`);
      url.searchParams.set('repository', repository);
      if (continuationToken) {
        url.searchParams.set('continuationToken', continuationToken);
      }

      const res = await fetch(url.toString(), { headers: authHeaders });
      if (!res.ok) {
        if (pageCount === 1) {
          throw new Error(
            `HTTP ${res.status} (${res.statusText}) querying repository ${repository}`,
          );
        }
        this.logger.warn(
          `Failed to fetch continuation page ${pageCount} for repository ${repository}: HTTP ${res.status}`,
        );
        break;
      }

      const data = await res.json();
      if (Array.isArray(data.items)) {
        allItems.push(...data.items);
      }
      continuationToken = data.continuationToken || null;
    } while (continuationToken && pageCount < maxPages);

    return allItems;
  }

  /**
   * Correctly groups assets by application and version directory.
   * Handles Nexus paths with or without leading slashes (e.g. "/superapp/v1.1.9/superapp-test-v1.1.9.apk").
   */
  groupAssetsByAppAndVersion(
    items: any[],
  ): Record<string, Record<string, any[]>> {
    const appGroups: Record<string, Record<string, any[]>> = {};

    for (const item of items) {
      const cleanParts = (item.path || '').split('/').filter(Boolean);
      let appName = 'superapp';
      let version = 'default';

      if (cleanParts.length >= 3) {
        // e.g. ["superapp", "v1.1.9", "superapp-test-v1.1.9.apk"]
        appName = cleanParts[0];
        version = cleanParts[1];
      } else if (cleanParts.length === 2) {
        // e.g. ["superapp", "superapp-test.apk"]
        appName = cleanParts[0];
        version = 'default';
      } else if (cleanParts.length === 1) {
        // e.g. ["superapp-test.apk"]
        appName = 'superapp';
        version = 'default';
      }

      if (!appGroups[appName]) appGroups[appName] = {};
      if (!appGroups[appName][version]) appGroups[appName][version] = [];
      appGroups[appName][version].push(item);
    }

    return appGroups;
  }

  /**
   * Sorts versions: 'latest' always protected first, then newest to oldest by creation/modification timestamp,
   * with natural/semantic version comparison as a tie-breaker.
   */
  sortVersions(
    versionMap: Record<string, any[]>,
  ): Array<{ version: string; items: any[]; time: number }> {
    const versions = Object.keys(versionMap).map((ver) => {
      const verItems = versionMap[ver];
      const maxTime = Math.max(
        ...verItems.map((it) => {
          const t = new Date(it.lastModified || it.blobCreated || 0).getTime();
          return isNaN(t) ? 0 : t;
        }),
      );
      return { version: ver, items: verItems, time: maxTime };
    });

    versions.sort((a, b) => {
      if (a.version === 'latest') return -1;
      if (b.version === 'latest') return 1;
      if (b.time !== a.time) return b.time - a.time;
      return b.version.localeCompare(a.version, undefined, { numeric: true });
    });

    return versions;
  }

  async getStorageStats(): Promise<StorageOverviewStats> {
    const policy = await this.getPolicy();
    const baseUrl = await this.getNexusBaseUrl();
    const authHeaders = this.getNexusAuthHeader();

    let testCount = 0;
    let testSizeMb = 0;
    let releaseCount = 0;
    let releaseSizeMb = 0;
    let prunableCount = 0;
    let prunableSizeMb = 0;

    try {
      // Fetch assets from apk-test-builds with pagination
      const items = await this.fetchAllRepositoryAssets(
        baseUrl,
        'apk-test-builds',
        authHeaders,
      );
      testCount = items.length;

      const appGroups = this.groupAssetsByAppAndVersion(items);
      const maxKeep = Math.max(1, policy.maxTestBuildsPerApp || 3);

      for (const appName of Object.keys(appGroups)) {
        const versions = this.sortVersions(appGroups[appName]);

        // Keep top N versions per app
        const canPruneApp =
          (appName === 'superapp' && policy.pruneSuperAppTestBuilds) ||
          (appName !== 'superapp' && policy.pruneMiniAppArtifacts);

        if (canPruneApp) {
          const candidates = versions.slice(maxKeep);
          for (const verObj of candidates) {
            for (const item of verObj.items) {
              prunableCount++;
              const size =
                typeof item.fileSize === 'number'
                  ? item.fileSize
                  : 50 * 1024 * 1024;
              prunableSizeMb += size / (1024 * 1024);
            }
          }
        }

        // Sum total test size
        for (const verObj of versions) {
          for (const item of verObj.items) {
            const size =
              typeof item.fileSize === 'number'
                ? item.fileSize
                : 50 * 1024 * 1024;
            testSizeMb += size / (1024 * 1024);
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Could not query Nexus apk-test-builds assets: ${err.message}`,
      );
    }

    try {
      // Fetch official releases (PERMANENTLY PROTECTED)
      const relItems = await this.fetchAllRepositoryAssets(
        baseUrl,
        'apk-releases',
        authHeaders,
      );
      releaseCount = relItems.length;
      for (const item of relItems) {
        const size =
          typeof item.fileSize === 'number'
            ? item.fileSize
            : 55 * 1024 * 1024;
        releaseSizeMb += size / (1024 * 1024);
      }
    } catch (err: any) {
      this.logger.warn(
        `Could not query Nexus apk-releases assets: ${err.message}`,
      );
    }

    // Calculate next run date/time display
    let nextScheduledRun: string | null = null;
    if (policy.enabled) {
      if (
        policy.scheduleType === 'specific_datetime' &&
        policy.specificRunDateTime
      ) {
        nextScheduledRun = policy.specificRunDateTime;
      } else {
        const [hh, mm] = (policy.scheduleTime || '02:00')
          .split(':')
          .map(Number);
        const next = new Date();
        next.setHours(hh, mm, 0, 0);
        if (next.getTime() <= Date.now()) {
          next.setDate(next.getDate() + 1);
        }
        nextScheduledRun = next.toISOString();
      }
    }

    return {
      nexusTestBuildsCount: testCount,
      nexusTestBuildsSizeMb: Math.round(testSizeMb * 10) / 10,
      nexusReleasesCount: releaseCount,
      nexusReleasesSizeMb: Math.round(releaseSizeMb * 10) / 10,
      protectedReleaseCount: releaseCount,
      estimatedPrunableMb: Math.round(prunableSizeMb * 10) / 10,
      estimatedPrunableCount: prunableCount,
      lastRunAt: policy.lastRunAt || null,
      lastFreedBytes: policy.lastFreedBytes || 0,
      nextScheduledRun,
    };
  }

  async executePruning(
    triggerSource:
      | 'MANUAL'
      | 'SCHEDULED_RECURRING'
      | 'SCHEDULED_SPECIFIC_DATETIME' = 'MANUAL',
  ): Promise<{
    success: boolean;
    triggerSource: string;
    prunedCount: number;
    freedBytes: number;
    freedMb: string;
    message: string;
    protectedReleasesPreserved: number;
    details: Array<{ path: string; size: string; status: string }>;
  }> {
    const policy = await this.getPolicy();
    const baseUrl = await this.getNexusBaseUrl();
    const authHeaders = this.getNexusAuthHeader();

    const maxKeep = Math.max(1, policy.maxTestBuildsPerApp || 3);
    const retentionDays = Math.max(1, policy.retentionDays || 14);

    this.logger.log(
      `Starting storage pruning job [Source: ${triggerSource}] with retention policy: keepLast=${maxKeep} build versions, ageThreshold=${retentionDays}d`,
    );

    let prunedCount = 0;
    let freedBytes = 0;
    const details: Array<{ path: string; size: string; status: string }> = [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      if (policy.pruneSuperAppTestBuilds || policy.pruneMiniAppArtifacts) {
        const items = await this.fetchAllRepositoryAssets(
          baseUrl,
          'apk-test-builds',
          authHeaders,
        );

        // Group assets by application and version directory
        const appGroups = this.groupAssetsByAppAndVersion(items);

        // Enforce dual-rule: protect last N build versions per app, delete older versions
        for (const appName of Object.keys(appGroups)) {
          if (appName === 'superapp' && !policy.pruneSuperAppTestBuilds) {
            continue;
          }
          if (appName !== 'superapp' && !policy.pruneMiniAppArtifacts) {
            continue;
          }

          const versions = this.sortVersions(appGroups[appName]);

          // Retain top N build versions unconditionally
          const protectedVersions = versions.slice(0, maxKeep);
          for (const verObj of protectedVersions) {
            for (const item of verObj.items) {
              const size =
                typeof item.fileSize === 'number'
                  ? item.fileSize
                  : 50 * 1024 * 1024;
              details.push({
                path: item.path || 'apk-test-builds/' + item.id,
                size: `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`,
                status: 'RETAINED_RECENT_BUILD',
              });
            }
          }

          // Inspect remainder versions for age cutoff or manual pruning
          const remainderVersions = versions.slice(maxKeep);
          for (const verObj of remainderVersions) {
            const isOlder = verObj.time < cutoffDate.getTime();
            const shouldPrune =
              triggerSource === 'MANUAL' ||
              triggerSource === 'SCHEDULED_SPECIFIC_DATETIME' ||
              isOlder;

            for (const item of verObj.items) {
              const size =
                typeof item.fileSize === 'number'
                  ? item.fileSize
                  : 50 * 1024 * 1024;
              if (shouldPrune) {
                try {
                  const delRes = await fetch(
                    `${baseUrl}/service/rest/v1/assets/${encodeURIComponent(item.id)}`,
                    { method: 'DELETE', headers: authHeaders },
                  );
                  if (delRes.ok || delRes.status === 204) {
                    prunedCount++;
                    freedBytes += size;
                    details.push({
                      path: item.path || item.id,
                      size: `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`,
                      status: 'PRUNED_SUCCESS',
                    });
                  } else {
                    this.logger.warn(
                      `Failed to delete asset ${item.id} (${item.path}): HTTP ${delRes.status} ${delRes.statusText}`,
                    );
                    details.push({
                      path: item.path || item.id,
                      size: `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`,
                      status: `FAILED_HTTP_${delRes.status}`,
                    });
                  }
                } catch (delErr: any) {
                  this.logger.warn(
                    `Failed to delete asset ${item.id}: ${delErr.message}`,
                  );
                  details.push({
                    path: item.path || item.id,
                    size: `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`,
                    status: 'DELETE_ERROR',
                  });
                }
              } else {
                details.push({
                  path: item.path || item.id,
                  size: `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`,
                  status: 'RETAINED_WITHIN_AGE_LIMIT',
                });
              }
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Storage pruning encountering Nexus error: ${err.message}`,
      );
    }

    // Update policy last run metrics
    const nowIso = new Date().toISOString();
    await this.updatePolicy({
      lastRunAt: nowIso,
      lastFreedBytes: freedBytes,
      lastPrunedCount: prunedCount,
    });

    const freedMbStr = (freedBytes / (1024 * 1024)).toFixed(1);
    this.logger.log(
      `Artifact pruning completed: Freed ${freedMbStr} MB (${prunedCount} test APKs removed). Official release APKs remained permanently protected.`,
    );

    const latestStats = await this.getStorageStats().catch(() => null);
    const protectedCount =
      latestStats?.protectedReleaseCount ??
      latestStats?.nexusReleasesCount ??
      0;

    return {
      success: true,
      triggerSource,
      prunedCount,
      freedBytes,
      freedMb: `${freedMbStr} MB`,
      message: `Successfully pruned ${prunedCount} old test build(s), freeing ${freedMbStr} MB of storage. All official releases (${protectedCount} in apk-releases) remain fully protected.`,
      protectedReleasesPreserved: protectedCount,
      details,
    };
  }
}
