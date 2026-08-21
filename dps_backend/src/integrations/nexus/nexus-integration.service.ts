import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NexusPackageValidation {
  isValid: boolean;
  packageName: string;
  exists: boolean;
  latestVersion?: string;
  versions?: string[];
  description?: string;
  error?: string;
}

@Injectable()
export class NexusIntegrationService {
  private readonly logger = new Logger(NexusIntegrationService.name);

  constructor(private readonly configService: ConfigService) {}

  private getPubGroupUrl(): string {
    const configured = this.configService.get<string>('NEXUS_PUB_GROUP_URL');
    if (configured) return configured.replace(/\/+$/, '');
    const baseUrl = this.configService.get<string>('NEXUS_BASE_URL') || 'http://localhost:8081';
    return `${baseUrl.replace(/\/+$/, '')}/repository/pub-group`;
  }

  private getPubHostedUrl(): string {
    const configured = this.configService.get<string>('NEXUS_PUB_HOSTED_URL');
    if (configured) return configured.replace(/\/+$/, '');
    const baseUrl = this.configService.get<string>('NEXUS_BASE_URL') || 'http://localhost:8081';
    return `${baseUrl.replace(/\/+$/, '')}/repository/pub-hosted`;
  }

  async getPackageInfo(packageName: string): Promise<NexusPackageValidation> {
    const trimmed = packageName.trim();
    if (!trimmed) {
      return {
        isValid: false,
        packageName: '',
        exists: false,
        error: 'Package name cannot be empty.',
      };
    }

    const groupUrl = `${this.getPubGroupUrl()}/api/packages/${encodeURIComponent(trimmed)}`;

    try {
      let res = await fetch(groupUrl, {
        headers: { Accept: 'application/vnd.pub.v2+json, application/json' },
      });

      if (!res.ok && res.status === 404) {
        // Fallback to pub-hosted directly
        const hostedUrl = `${this.getPubHostedUrl()}/api/packages/${encodeURIComponent(trimmed)}`;
        res = await fetch(hostedUrl, {
          headers: { Accept: 'application/vnd.pub.v2+json, application/json' },
        });
      }

      if (!res.ok) {
        if (res.status === 404) {
          return {
            isValid: true,
            packageName: trimmed,
            exists: false,
            error: `Package '${trimmed}' was not found in Nexus pub-group.`,
          };
        }
        return {
          isValid: false,
          packageName: trimmed,
          exists: false,
          error: `Nexus registry returned HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data = (await res.json()) as any;
      const versions = Array.isArray(data.versions)
        ? data.versions.map((v: any) => (typeof v === 'string' ? v : v.version || v)).filter(Boolean).reverse()
        : [];

      return {
        isValid: true,
        packageName: data.name || trimmed,
        exists: true,
        latestVersion: data.latest?.version || (versions.length > 0 ? versions[0] : '1.0.0'),
        versions,
        description: data.latest?.pubspec?.description,
      };
    } catch (err: any) {
      return {
        isValid: false,
        packageName: trimmed,
        exists: false,
        error: `Could not reach Nexus registry at ${this.getPubGroupUrl()}: ${err.message}`,
      };
    }
  }

  generateSnippet(options: { packageName: string; versionConstraint?: string }): string {
    const pkg = options.packageName.trim() || 'package_name';
    const ver = options.versionConstraint?.trim() || '^1.0.0';
    const groupUrl = this.getPubGroupUrl();

    return `dependencies:\n  ${pkg}:\n    hosted: ${groupUrl}\n    version: ${ver}`;
  }
}
