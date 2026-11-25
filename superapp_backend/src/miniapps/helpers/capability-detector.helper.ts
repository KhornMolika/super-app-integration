import { Injectable, Logger, Optional } from '@nestjs/common';
import AdmZip from 'adm-zip';
import * as YAML from 'yaml';
import { GitIntegrationService } from '../../integrations/git/git-integration.service';
import { GitLabProvider } from '../../integrations/git/providers/gitlab.provider';
import { StorageService } from '../../storage/storage.service';
import { CapabilitiesService } from '../../capabilities/capabilities.service';
import { CapabilityDefinition } from '../../capabilities/entities/capability-definition.entity';
import { findMatchingDefinition } from '../../capabilities/capability-aliases';

export interface DetectedPermissionResult {
  type: string;
  purpose: string;
  source: string;
  confidence: 'HIGH' | 'MEDIUM';
}

@Injectable()
export class CapabilityDetectorHelper {
  private readonly logger = new Logger(CapabilityDetectorHelper.name);

  constructor(
    @Optional() private readonly gitIntegrationService?: GitIntegrationService,
    @Optional() private readonly gitlabProvider?: GitLabProvider,
    @Optional() private readonly storageService?: StorageService,
    @Optional() private readonly capabilitiesService?: CapabilitiesService,
  ) {}

  /**
   * Automatically discovers required capabilities from MiniApp endpoint,
   * Git repository (pubspec.yaml), association file (.well-known),
   * uploaded Native SDK binaries (.aar / .xcframework), and JS bundle scan,
   * using dynamic rules stored in PostgreSQL `capability_definitions`.
   */
  async detect(body: {
    productionUrl?: string;
    name?: string;
    appId?: string;
    gitUrl?: string;
    gitBranch?: string;
    gitPath?: string;
    androidStoragePath?: string;
    iosStoragePath?: string;
  }): Promise<{
    success: boolean;
    detected: DetectedPermissionResult[];
    count: number;
  }> {
    const detected: DetectedPermissionResult[] = [];
    const addedKeys = new Set<string>();
    const appLabel = body.name?.trim() || '$(PRODUCT_NAME)';

    const definitions = this.capabilitiesService
      ? await this.capabilitiesService.getActiveDefinitions()
      : [];

    const formatCompliantPurpose = (
      label: string,
      rawPurpose: string,
    ): string => {
      const trimmed = (rawPurpose || '').trim();
      if (!trimmed) {
        return `${appLabel} requires access to your ${label.toLowerCase()} to provide core mini application features.`;
      }
      if (
        trimmed.toLowerCase().includes('requires') &&
        (trimmed.toLowerCase().startsWith(appLabel.toLowerCase()) ||
          trimmed.startsWith('$('))
      ) {
        return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
      }
      let cleaned = trimmed;
      if (/^(to|for)\s+/i.test(cleaned)) {
        cleaned = cleaned.replace(/^(to|for)\s+/i, '');
      }
      cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
      if (cleaned.endsWith('.')) {
        cleaned = cleaned.slice(0, -1);
      }
      return `${appLabel} requires access to your ${label.toLowerCase()} to ${cleaned}.`;
    };

    const addCapability = (
      type: string,
      purpose: string,
      source: string,
      confidence: 'HIGH' | 'MEDIUM' = 'HIGH',
    ) => {
      const cleanType = (type || '').trim();
      if (!cleanType) return;
      const dedupeKey = cleanType.toLowerCase();
      if (!addedKeys.has(dedupeKey)) {
        addedKeys.add(dedupeKey);
        const def = findMatchingDefinition(cleanType, definitions);
        const label = def?.name || cleanType;
        const resolvedPurpose =
          purpose ||
          def?.detectionRules?.defaultPurpose ||
          `support ${label.toLowerCase()} features`;
        detected.push({
          type: cleanType,
          purpose: formatCompliantPurpose(label, resolvedPurpose),
          source,
          confidence,
        });
      }
    };

    // 0. Check Git repository if gitUrl is provided (fetches pubspec.yaml)
    if (
      body.gitUrl &&
      body.gitUrl.trim() &&
      (this.gitIntegrationService || this.gitlabProvider)
    ) {
      try {
        const branch = body.gitBranch?.trim() || 'main';
        const targetPath = body.gitPath?.trim()
          ? `${body.gitPath.trim().replace(/^\/+|\/+$/g, '')}/pubspec.yaml`
          : 'pubspec.yaml';
        this.logger.log(
          `Auto-detecting capabilities from Git repository '${body.gitUrl}' (branch: ${branch}, file: ${targetPath})`,
        );
        const pubspecRaw = this.gitIntegrationService
          ? await this.gitIntegrationService.getFileContent(
              body.gitUrl.trim(),
              targetPath,
              branch,
            )
          : await this.gitlabProvider!.getFileContent(
              body.gitUrl.trim(),
              targetPath,
              branch,
            );
        if (pubspecRaw) {
          const parsed = YAML.parse(pubspecRaw);
          const pkgDeps = parsed?.dependencies || {};
          const detectedFromGit = await this.detectFromPubspecDependencies(
            pkgDeps,
            body.name || parsed?.name,
            definitions,
          );
          const providerLabel = body.gitUrl.toLowerCase().includes('github')
            ? 'GitHub'
            : 'GitLab';
          for (const item of detectedFromGit) {
            addCapability(
              item.type,
              item.purpose,
              `${providerLabel} (${branch}): ${item.source}`,
              item.confidence,
            );
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `Could not auto-detect capabilities from Git repository (${body.gitUrl}): ${err.message}`,
        );
      }
    }

    // 1. Check association file if productionUrl is provided
    if (body.productionUrl && body.productionUrl.trim()) {
      try {
        const parsed = new URL(body.productionUrl.trim());
        const assocUrl = `${parsed.origin}/.well-known/superapp-miniapp-association.json`;
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(assocUrl, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const caps =
            json.capabilities ||
            json.requestedCapabilities ||
            json.requiredCapabilities ||
            json.permissions ||
            json.requestedPermissions ||
            json.requiredPermissions;
          if (Array.isArray(caps)) {
            for (const c of caps) {
              const rawType = typeof c === 'string' ? c : c.type || c.key;
              if (!rawType) continue;
              const matched = findMatchingDefinition(rawType, definitions);
              const resolvedType = matched?.key || rawType;
              const resolvedPurpose =
                (typeof c === 'object' && c.purpose) ||
                matched?.detectionRules?.defaultPurpose ||
                'support features declared in MiniApp association configuration';
              addCapability(
                resolvedType,
                resolvedPurpose,
                'Association File (.well-known)',
                'HIGH',
              );
            }
          }
        }
      } catch {
        // Association file might not be reachable or not contain capabilities
      }

      // 2. Scan remote HTML & JS scripts using DB-stored jsBridgeKeywords
      try {
        const parsed = new URL(body.productionUrl.trim());
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(parsed.origin, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
          const html = await res.text();
          let combinedCode = html;

          const scriptSrcMatches = Array.from(
            html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi),
          );
          const scriptsToFetch = scriptSrcMatches
            .map((m) => m[1])
            .filter(
              (src) =>
                src &&
                (!src.startsWith('http') || src.startsWith(parsed.origin)),
            )
            .slice(0, 3);

          for (const scriptSrc of scriptsToFetch) {
            try {
              const fullScriptUrl = scriptSrc.startsWith('http')
                ? scriptSrc
                : new URL(scriptSrc, parsed.origin).href;
              const sCtrl = new AbortController();
              const sTid = setTimeout(() => sCtrl.abort(), 2000);
              const sRes = await fetch(fullScriptUrl, { signal: sCtrl.signal });
              clearTimeout(sTid);
              if (sRes.ok) {
                const jsText = await sRes.text();
                combinedCode += ' ' + jsText;
              }
            } catch {
              // Ignore individual bundle failures
            }
          }

          const lower = combinedCode.toLowerCase();
          for (const def of definitions) {
            const keywords = def.detectionRules?.jsBridgeKeywords;
            if (!Array.isArray(keywords) || keywords.length === 0) continue;
            const matchedKw = keywords.find(
              (kw) => typeof kw === 'string' && kw.trim() && lower.includes(kw.toLowerCase().trim()),
            );
            if (matchedKw) {
              addCapability(
                def.key,
                def.detectionRules?.defaultPurpose || def.description || '',
                `Code Scan (${matchedKw})`,
                'HIGH',
              );
            }
          }
        }
      } catch {
        // Endpoint scan optional
      }
    }

    // 3. Scan uploaded Native SDK binaries (.aar AndroidManifest.xml / iOS Info.plist)
    if (
      this.storageService &&
      (body.androidStoragePath?.trim() || body.iosStoragePath?.trim())
    ) {
      await this.detectFromNativeArtifacts(
        body.androidStoragePath?.trim(),
        body.iosStoragePath?.trim(),
        definitions,
        addCapability,
      );
    }

    return {
      success: true,
      detected,
      count: detected.length,
    };
  }

  /**
   * Inspects uploaded Native SDK archives (.aar / .xcframework) in MinIO
   * against DB-configured `detectionRules.androidPermissions` and `detectionRules.iosPlistKeys`.
   */
  private async detectFromNativeArtifacts(
    androidStoragePath: string | undefined,
    iosStoragePath: string | undefined,
    definitions: CapabilityDefinition[],
    addCapability: (
      type: string,
      purpose: string,
      source: string,
      confidence?: 'HIGH' | 'MEDIUM',
    ) => void,
  ): Promise<void> {
    if (!this.storageService || definitions.length === 0) return;

    const paths = [androidStoragePath, iosStoragePath].filter(
      (p): p is string => Boolean(p),
    );

    for (const storagePath of paths) {
      try {
        const buffer = await this.storageService.getObjectBuffer(
          this.storageService.packageSubmissionsBucket,
          storagePath,
        );
        const zip = new AdmZip(buffer);
        for (const entry of zip.getEntries()) {
          if (entry.isDirectory) continue;
          const name = entry.entryName.toLowerCase();
          if (name.endsWith('androidmanifest.xml')) {
            const xml = entry.getData().toString('utf8');
            for (const def of definitions) {
              const androidPerms = def.detectionRules?.androidPermissions;
              if (!Array.isArray(androidPerms)) continue;
              const hit = androidPerms.find(
                (p) => typeof p === 'string' && p.trim() && xml.includes(p.trim()),
              );
              if (hit) {
                addCapability(
                  def.key,
                  def.detectionRules?.defaultPurpose || def.description || '',
                  `Native AndroidManifest (${hit})`,
                  'HIGH',
                );
              }
            }
          } else if (name.endsWith('info.plist')) {
            const plist = entry.getData().toString('utf8');
            for (const def of definitions) {
              const plistKeys = def.detectionRules?.iosPlistKeys;
              if (!Array.isArray(plistKeys)) continue;
              const hit = plistKeys.find(
                (k) => typeof k === 'string' && k.trim() && plist.includes(k.trim()),
              );
              if (hit) {
                addCapability(
                  def.key,
                  def.detectionRules?.defaultPurpose || def.description || '',
                  `Native iOS Info.plist (${hit})`,
                  'HIGH',
                );
              }
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `Could not auto-detect capabilities from native artifact (${storagePath}): ${err?.message || err}`,
        );
      }
    }
  }

  /**
   * Discovers required capabilities by matching Flutter pubspec.yaml dependencies
   * against DB-configured `detectionRules.pubspecPackages`.
   */
  async detectFromPubspecDependencies(
    dependencies: Record<string, any> = {},
    appName?: string,
    preloadedDefinitions?: CapabilityDefinition[],
  ): Promise<DetectedPermissionResult[]> {
    const definitions =
      preloadedDefinitions ??
      (this.capabilitiesService
        ? await this.capabilitiesService.getActiveDefinitions()
        : []);

    const detected: DetectedPermissionResult[] = [];
    const addedKeys = new Set<string>();
    const appLabel = appName?.trim() || '$(PRODUCT_NAME)';
    const depKeys = Object.keys(dependencies || {}).map((k) => k.toLowerCase());

    if (depKeys.length === 0 || definitions.length === 0) {
      return detected;
    }

    for (const def of definitions) {
      const pkgRules = def.detectionRules?.pubspecPackages;
      if (!Array.isArray(pkgRules) || pkgRules.length === 0) continue;

      const matchedDep = depKeys.find((dep) =>
        pkgRules.some((rule) => {
          const r = String(rule || '').toLowerCase().trim();
          return r && (dep === r || dep.includes(r));
        }),
      );

      if (matchedDep && !addedKeys.has(def.key.toLowerCase())) {
        addedKeys.add(def.key.toLowerCase());
        const reason =
          def.detectionRules?.defaultPurpose ||
          def.description ||
          `support ${def.name.toLowerCase()} features`;
        const cleanReason = reason.replace(/^(to|for)\s+/i, '').trim().replace(/\.$/, '');
        detected.push({
          type: def.key,
          purpose: `${appLabel} requires access to your ${(def.name || def.key).toLowerCase()} to ${cleanReason}.`,
          source: `Flutter Plugin (${matchedDep})`,
          confidence: 'HIGH',
        });
      }
    }

    return detected;
  }
}
