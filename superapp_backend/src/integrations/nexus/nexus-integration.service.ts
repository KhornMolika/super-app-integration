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

  /**
   * Packages a Flutter mini app (.zip / directory buffer) into a standard .tar.gz archive
   * and publishes it to the Nexus pub-hosted registry via the Pub API.
   */
  async publishPubArchive(
    archiveBuffer: Buffer,
    packageName: string,
    version = '1.0.0',
  ): Promise<{ success: boolean; packageName: string; version: string; message: string }> {
    const AdmZip = require('adm-zip');
    const zlib = require('zlib');

    const cleanPkg = packageName.trim().replace(/-/g, '_').toLowerCase();
    const cleanVer = version.trim().replace(/^[\^~>=<]+/, '') || '1.0.0';

    // Extract zip entries in memory
    const zip = new AdmZip(archiveBuffer);
    const zipEntries = zip.getEntries();

    let pubspecContent = '';
    let hasReadme = false;
    const filesToPack: { name: string; data: Buffer }[] = [];

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const entryName = entry.entryName.replace(/\\/g, '/');
      const lower = entryName.toLowerCase();

      // Skip build caches, ide files, and binaries
      if (
        lower.startsWith('build/') ||
        lower.startsWith('.dart_tool/') ||
        lower.startsWith('.git/') ||
        lower.startsWith('.gradle/') ||
        lower.startsWith('.idea/') ||
        lower.startsWith('.vscode/') ||
        lower.includes('/.gradle/') ||
        lower.includes('/.dart_tool/') ||
        lower.includes('/build/') ||
        lower.endsWith('.apk') ||
        lower.endsWith('.aar') ||
        lower.endsWith('.ipa') ||
        lower.endsWith('.tmp')
      ) {
        continue;
      }

      let data = entry.getData();
      if (lower === 'pubspec.yaml' || lower.endsWith('/pubspec.yaml')) {
        let pubText = data.toString('utf8');
        pubText = pubText.replace(/publish_to:\s*["']?none["']?/g, '');
        data = Buffer.from(pubText, 'utf8');
        pubspecContent = pubText;
      }
      if (lower === 'readme.md' || lower.endsWith('/readme.md')) {
        hasReadme = true;
      }

      // If zipped inside a wrapper subfolder, strip root wrapper
      let relativeName = entryName;
      const slashIdx = entryName.indexOf('/');
      if (slashIdx > 0 && !entryName.startsWith('lib/') && !entryName.startsWith('assets/')) {
        const topFolder = entryName.substring(0, slashIdx);
        if (zipEntries.some(e => e.entryName.includes('pubspec.yaml') && e.entryName.startsWith(topFolder))) {
          relativeName = entryName.substring(slashIdx + 1);
        }
      }

      filesToPack.push({ name: relativeName, data });
    }

    if (!hasReadme) {
      filesToPack.push({
        name: 'README.md',
        data: Buffer.from(`# ${cleanPkg}\n\nAutomated package distribution for Super App.\n`, 'utf8'),
      });
    }

    // Build standard POSIX UStar .tar archive in memory
    const tarChunks: Buffer[] = [];
    for (const file of filesToPack) {
      const header = Buffer.alloc(512);
      const nameBuf = Buffer.from(file.name, 'utf8');
      nameBuf.copy(header, 0, 0, Math.min(nameBuf.length, 100));

      header.write('0000644\0', 100, 8, 'ascii'); // mode
      header.write('0000000\0', 108, 8, 'ascii'); // uid
      header.write('0000000\0', 116, 8, 'ascii'); // gid
      const sizeOctal = file.data.length.toString(8).padStart(11, '0') + ' ';
      header.write(sizeOctal, 124, 12, 'ascii'); // size
      const mtimeOctal = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + ' ';
      header.write(mtimeOctal, 136, 12, 'ascii'); // mtime
      header.write('0', 156, 1, 'ascii'); // typeflag regular file
      header.write('ustar\0', 257, 6, 'ascii'); // magic
      header.write('00', 263, 2, 'ascii'); // version

      header.fill(32, 148, 156);
      let chksum = 0;
      for (let i = 0; i < 512; i++) {
        chksum += header[i];
      }
      const chksumOctal = chksum.toString(8).padStart(6, '0') + '\0 ';
      header.write(chksumOctal, 148, 8, 'ascii');

      tarChunks.push(header);
      tarChunks.push(file.data);

      const remainder = file.data.length % 512;
      if (remainder !== 0) {
        tarChunks.push(Buffer.alloc(512 - remainder));
      }
    }

    tarChunks.push(Buffer.alloc(1024));
    const tarBuffer = Buffer.concat(tarChunks);
    const tarGzBuffer = zlib.gzipSync(tarBuffer);

    const hostedUrl = this.getPubHostedUrl();
    const authHeader = this.getAuthHeader();

    const initRes = await fetch(`${hostedUrl}/api/packages/versions/new`, {
      headers: {
        Accept: 'application/vnd.pub.v2+json',
        ...authHeader,
      },
    });

    if (!initRes.ok) {
      throw new Error(`Failed to initiate Nexus Pub upload: HTTP ${initRes.status} ${initRes.statusText}`);
    }

    const initData = await initRes.json();
    const uploadUrl = initData.url || `${hostedUrl}/api/packages/versions/newUpload`;

    const formData = new FormData();
    const blob = new Blob([tarGzBuffer], { type: 'application/gzip' });
    formData.append('file', blob, `${cleanPkg}-${cleanVer}.tar.gz`);

    if (initData.fields) {
      for (const [k, v] of Object.entries(initData.fields)) {
        formData.append(k, v as string);
      }
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: authHeader,
    });

    if (!uploadRes.ok && uploadRes.status !== 200 && uploadRes.status !== 204 && uploadRes.status !== 302) {
      const errText = await uploadRes.text();
      throw new Error(`Nexus Pub package upload failed with HTTP ${uploadRes.status}: ${errText}`);
    }

    this.logger.log(`Successfully published "${cleanPkg}" (${cleanVer}) to Nexus pub-hosted repository.`);
    return {
      success: true,
      packageName: cleanPkg,
      version: cleanVer,
      message: `Package "${cleanPkg}" successfully published to Nexus pub-hosted registry.`,
    };
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

