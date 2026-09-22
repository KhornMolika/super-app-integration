import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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

  private getBaseUrl(): string {
    return (
      this.configService.get<string>('NEXUS_BASE_URL') ||
      'http://localhost:8081'
    ).replace(/\/+$/, '');
  }

  private getAuthHeader(): Record<string, string> {
    const user = this.configService.get<string>('NEXUS_ADMIN_USER', 'admin');
    const pass = this.configService.get<string>('NEXUS_ADMIN_PASSWORD');
    if (!pass) {
      throw new ServiceUnavailableException(
        'NEXUS_ADMIN_PASSWORD is not configured; cannot upload to Nexus.',
      );
    }
    const b64 = Buffer.from(`${user}:${pass}`).toString('base64');
    return { Authorization: `Basic ${b64}` };
  }

  /**
   * Uploads a single file to a Nexus raw (or other path-addressed) hosted
   * repository via HTTP PUT and returns its download URL.
   */
  async putRawAsset(
    repo: string,
    path: string,
    buffer: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<string> {
    const cleanPath = path.replace(/^\/+/, '');
    const url = `${this.getBaseUrl()}/repository/${repo}/${cleanPath}`;
    const authHeader = this.getAuthHeader();
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': contentType },
        body: new Uint8Array(buffer),
      });
    } catch (err: any) {
      throw new Error(`Could not reach Nexus at ${url}: ${err.message}`);
    }
    if (!res.ok) {
      throw new Error(
        `Nexus upload to ${url} failed with HTTP ${res.status}: ${res.statusText}`,
      );
    }
    return url;
  }

  /**
   * Uploads an .aar to a Nexus Maven hosted repository through the
   * components API and returns the resulting Maven URL.
   */
  async uploadMavenAar(options: {
    repo: string;
    groupId: string;
    artifactId: string;
    version: string;
    buffer: Buffer;
    filename: string;
  }): Promise<string> {
    const { repo, groupId, artifactId, version, buffer, filename } = options;
    const form = new FormData();
    form.append('maven2.groupId', groupId);
    form.append('maven2.artifactId', artifactId);
    form.append('maven2.version', version);
    form.append('maven2.asset1', new Blob([new Uint8Array(buffer)]), filename);
    form.append('maven2.asset1.extension', 'aar');
    // Let Nexus generate the POM and mark the packaging so Gradle resolves the .aar.
    form.append('maven2.generate-pom', 'true');
    form.append('maven2.packaging', 'aar');

    const endpoint = `${this.getBaseUrl()}/service/rest/v1/components?repository=${encodeURIComponent(repo)}`;
    const authHeader = this.getAuthHeader();
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeader,
        body: form,
      });
    } catch (err: any) {
      throw new Error(`Could not reach Nexus at ${endpoint}: ${err.message}`);
    }
    if (!res.ok) {
      throw new Error(
        `Nexus Maven upload to ${repo} failed with HTTP ${res.status}: ${res.statusText}`,
      );
    }
    return `${this.getBaseUrl()}/repository/${repo}/${groupId.replace(/\./g, '/')}/${artifactId}/${version}/${artifactId}-${version}.aar`;
  }

  private getPubGroupUrl(): string {
    const configured = this.configService.get<string>('NEXUS_PUB_GROUP_URL');
    if (configured) return configured.replace(/\/+$/, '');
    const baseUrl =
      this.configService.get<string>('NEXUS_BASE_URL') ||
      'http://localhost:8081';
    return `${baseUrl.replace(/\/+$/, '')}/repository/pub-group`;
  }

  private getPubHostedUrl(): string {
    const configured = this.configService.get<string>('NEXUS_PUB_HOSTED_URL');
    if (configured) return configured.replace(/\/+$/, '');
    const baseUrl =
      this.configService.get<string>('NEXUS_BASE_URL') ||
      'http://localhost:8081';
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

      const data = await res.json();
      const versions = Array.isArray(data.versions)
        ? data.versions
            .map((v: any) => (typeof v === 'string' ? v : v.version || v))
            .filter(Boolean)
            .reverse()
        : [];

      return {
        isValid: true,
        packageName: data.name || trimmed,
        exists: true,
        latestVersion:
          data.latest?.version || (versions.length > 0 ? versions[0] : '1.0.0'),
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

  generateSnippet(options: {
    packageName: string;
    versionConstraint?: string;
  }): string {
    const pkg = options.packageName.trim() || 'package_name';
    const ver = options.versionConstraint?.trim() || '^1.0.0';
    const groupUrl = this.getPubGroupUrl();

    return `dependencies:\n  ${pkg}: ${ver}\n\n# Hosted on Sonatype Nexus Private Registry\n# Resolves via environment: PUB_HOSTED_URL=${groupUrl}`;
  }
}
