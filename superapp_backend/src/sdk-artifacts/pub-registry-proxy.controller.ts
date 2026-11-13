import {
  Controller,
  Get,
  Req,
  Res,
  Param,
  Logger,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService, BACK_OFFICE_TYP } from '../auth/auth.service';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { nexusApiBaseUrl } from '../integrations/nexus/nexus-url';
import { DEFAULT_PUB_GATEWAY } from '../integrations/flutter/miniapp-dependency.util';

/** The file name of an archive link (no query string). */
export function archiveFileName(archiveUrl: string): string {
  try {
    return path.posix.basename(new URL(archiveUrl, 'http://x/').pathname);
  } catch {
    return path.posix.basename(String(archiveUrl).split('?')[0]);
  }
}

/**
 * [archiveUrl] as Nexus wrote it (often its public address, or relative) on
 * [nexusBase]: the path from /repository/ on, with its query.
 */
export function onNexusBase(archiveUrl: string, nexusBase: string): string {
  const base = nexusBase.replace(/\/+$/, '');
  const u = new URL(archiveUrl, `${base}/repository/pub-hosted/`);
  const at = u.pathname.indexOf('/repository/');
  return at >= 0 ? `${base}${u.pathname.slice(at)}${u.search}` : u.toString();
}

/** First value of a possibly repeated or comma-joined forwarded header. */
function firstHeader(v: string | string[] | undefined): string {
  return String(Array.isArray(v) ? v[0] : v || '').split(',')[0].trim();
}

/**
 * The /pub base for archive links: the configured gateway when set, else the
 * address the request came in on (local development).
 */
export function publicPubBase(configured: string | undefined, req: Request): string {
  const base = (configured || (process.env.NODE_ENV === 'production' ? DEFAULT_PUB_GATEWAY : '')).trim().replace(/\/+$/, '');
  if (base) return base;
  const proto = firstHeader(req.headers['x-forwarded-proto']) || req.protocol || 'https';
  const host = firstHeader(req.headers['x-forwarded-host']) || req.get('host') || 'app.fintechcenterfsa.com';
  return `${proto}://${host}/pub`;
}

/**
 * Scoped Dart Pub Registry Gateway Controller (/pub/*)
 *
 * Provides an authenticated, strictly isolated reverse proxy for FSA Flutter SDK packages.
 * MiniApp developers configure `pubspec.yaml` with:
 *   hosted:
 *     name: fsa_superapp_flutter_sdk
 *     url: https://app.fintechcenterfsa.com/pub
 *
 * Dart Pub natively queries:
 *   GET /pub/api/packages/:packageName
 *   GET /pub/packages/:packageName/versions/:version.tar.gz
 *
 * Who may read what (Bearer token from `dart pub token add`):
 * - any valid developer token: only the FSA SDK packages (`fsa_superapp_flutter*`)
 * - a Back Office token with super_app:manage, or the Jenkins callback token
 *   (RELEASE_CALLBACK_TOKEN): every package in pub-hosted, i.e. the mini app
 *   packages published after their security scan. The Super App's pubspec.yaml
 *   points here, so its builds (Jenkins or a team PC) resolve them.
 * Proxies to internal Nexus (pub-hosted) and rewrites archive URLs.
 */
@Controller(['pub', 'api/pub'])
export class PubRegistryProxyController {
  private readonly logger = new Logger(PubRegistryProxyController.name);

  private readonly allowedPackages = new Set([
    'fsa_superapp_miniapp_flutter_sdk',
    'fsa_superapp_flutter_sdk',
  ]);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Dart Pub Package Version Listing & Metadata
   * Handles: GET /pub/api/packages/:packageName
   */
  @Get('api/packages/:packageName')
  async getPackageMetadata(
    @Param('packageName') packageName: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cleanName = this.cleanPackageName(packageName);
    this.assertPackageAllowed(cleanName, this.authenticateRequest(req));
    return this.handleMetadata(cleanName, req, res);
  }

  /**
   * Dart Pub Tarball Archive Download
   * Handles: GET /pub/packages/:packageName/versions/:versionArchive
   */
  @Get('packages/:packageName/versions/:versionArchive')
  async getPackageArchive(
    @Param('packageName') packageName: string,
    @Param('versionArchive') versionArchive: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cleanName = this.cleanPackageName(packageName);
    this.assertPackageAllowed(cleanName, this.authenticateRequest(req));
    if (!/^[A-Za-z0-9._+-]+.tar.gz$/.test(versionArchive || '') || versionArchive.includes('..')) {
      throw new NotFoundException('Archive not found.');
    }
    return this.handleArchive(cleanName, versionArchive, res);
  }

  /** Dart package names only: no paths into other repositories. */
  private cleanPackageName(packageName: string): string {
    const name = (packageName || '').trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(name)) {
      throw new NotFoundException('Package not found.');
    }
    return name;
  }

  private isSdkPackage(packageName: string): boolean {
    return this.allowedPackages.has(packageName) || packageName.startsWith('fsa_superapp_flutter');
  }

  /**
   * Least privilege: developer tokens read only the FSA SDK packages; Super App
   * builds ('all') read every package in pub-hosted.
   */
  private assertPackageAllowed(packageName: string, access: 'sdk' | 'all') {
    if (access !== 'all' && !this.isSdkPackage(packageName)) {
      this.logger.warn(
        `[LeastPrivilege Violation] Blocked unauthorized Pub request for: "${packageName}"`,
      );
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: `Least Privilege Violation: Token is strictly restricted to official FSA Flutter packages. Access to package "${packageName}" or internal repositories is blocked.`,
      });
    }
  }

  /**
   * Authenticates the Bearer token and says what it may read: 'all' for the
   * Jenkins callback token or a Back Office token with super_app:manage,
   * otherwise 'sdk'.
   */
  private authenticateRequest(req: Request): 'sdk' | 'all' {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader) {
      const [type, credentials] = authHeader.split(' ');
      if (type?.toLowerCase() === 'bearer' && credentials) {
        token = credentials;
      }
    }

    if (!token && req.query?.access_token) {
      token = String(req.query.access_token);
    }

    if (token) {
      if (this.isBuildToken(token)) return 'all';
      try {
        const payload = this.authService.verifyToken(token);
        req['user'] = payload;
        const canBuild =
          payload?.typ === BACK_OFFICE_TYP &&
          Array.isArray(payload?.permissions) &&
          payload.permissions.includes('super_app:manage');
        return canBuild ? 'all' : 'sdk';
      } catch (err: unknown) {
        if (process.env.NODE_ENV === 'production') {
          throw new UnauthorizedException(
            'Invalid or expired developer token.',
          );
        }
      }
    }

    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException(
        'Authentication required. Please configure your token with `dart pub token add https://app.fintechcenterfsa.com/pub`.',
      );
    }

    this.logger.debug(
      'Proceeding in dev mode without verified token for Flutter package.',
    );
    return 'sdk';
  }

  /** The Jenkins callback token (RELEASE_CALLBACK_TOKEN), compared in constant time. */
  private isBuildToken(token: string): boolean {
    const expected = (this.configService.get<string>('RELEASE_CALLBACK_TOKEN') || '').trim();
    if (!expected || expected.startsWith('CHANGE_ME')) return false;
    const hash = (v: string) => crypto.createHash('sha256').update(v).digest();
    return crypto.timingSafeEqual(hash(token.trim()), hash(expected));
  }

  /**
   * Fetches package metadata from Nexus pub-hosted repository and rewrites archive URLs.
   */
  private async handleMetadata(
    packageName: string,
    req: Request,
    res: Response,
  ) {
    const nexusBase = this.getNexusBaseUrl();
    const nexusAuth = this.getNexusAuthHeader();
    const upstreamUrl = `${nexusBase}/repository/pub-hosted/api/packages/${packageName}`;

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          ...nexusAuth,
          Accept: 'application/vnd.pub.v2+json, application/json',
        },
      });

      if (upstreamRes.ok) {
        const metadata = await upstreamRes.json();
        const publicPubBase = this.getPublicPubBase(req);

        // Rewrite archive_url to point back to our /pub gateway
        if (metadata.latest && metadata.latest.archive_url) {
          const filename = archiveFileName(metadata.latest.archive_url);
          metadata.latest.archive_url = `${publicPubBase}/packages/${packageName}/versions/${filename}`;
        }

        if (Array.isArray(metadata.versions)) {
          for (const ver of metadata.versions) {
            if (ver.archive_url) {
              const filename = archiveFileName(ver.archive_url);
              ver.archive_url = `${publicPubBase}/packages/${packageName}/versions/${filename}`;
            }
          }
        }

        res.setHeader('Content-Type', 'application/vnd.pub.v2+json');
        return res.json(metadata);
      }
      this.logger.warn(`Nexus answered HTTP ${upstreamRes.status} for ${upstreamUrl}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Nexus pub query failed at ${upstreamUrl}: ${msg}`);
    }

    // Local workspace fallback (dev/POC without Nexus): only for the SDK, never
    // invented metadata for a mini app package, and never in production
    const localMetadata =
      process.env.NODE_ENV !== 'production' && this.isSdkPackage(packageName)
        ? this.generateLocalFallbackMetadata(packageName, req)
        : null;
    if (localMetadata) {
      res.setHeader('Content-Type', 'application/vnd.pub.v2+json');
      return res.json(localMetadata);
    }

    throw new NotFoundException(
      `Flutter package "${packageName}" not found on repository storage.`,
    );
  }

  /**
   * Streams package archive (.tar.gz) from internal Nexus.
   */
  private async handleArchive(
    packageName: string,
    archiveFilename: string,
    res: Response,
  ) {
    const nexusBase = this.getNexusBaseUrl();
    const nexusAuth = this.getNexusAuthHeader();
    // The archive link Nexus itself lists for this file (its layout is Nexus's
    // business), else the conventional pub path
    const upstreamUrl =
      (await this.nexusArchiveUrl(packageName, archiveFilename)) ||
      `${nexusBase}/repository/pub-hosted/packages/${packageName}/versions/${archiveFilename}`;

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        headers: nexusAuth,
      });

      if (upstreamRes.ok) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${archiveFilename}"`,
        );
        const len = upstreamRes.headers.get('content-length');
        if (len) res.setHeader('Content-Length', len);

        if (upstreamRes.body) {
          const nodeStream = Readable.fromWeb(upstreamRes.body as any);
          return nodeStream.pipe(res);
        } else {
          const buf = await upstreamRes.arrayBuffer();
          return res.send(Buffer.from(buf));
        }
      }
      this.logger.warn(`Nexus answered HTTP ${upstreamRes.status} for archive ${upstreamUrl}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not stream archive from ${upstreamUrl}: ${msg}`);
    }

    throw new NotFoundException(
      `Archive "${archiveFilename}" not found on repository storage.`,
    );
  }

  /**
   * The archive_url Nexus lists for [archiveFilename] of [packageName], moved
   * onto the address the backend reaches Nexus at. Null when not listed.
   */
  private async nexusArchiveUrl(packageName: string, archiveFilename: string): Promise<string | null> {
    const nexusBase = this.getNexusBaseUrl();
    const metadataUrl = `${nexusBase}/repository/pub-hosted/api/packages/${packageName}`;
    try {
      const r = await fetch(metadataUrl, {
        headers: { ...this.getNexusAuthHeader(), Accept: 'application/vnd.pub.v2+json, application/json' },
      });
      if (!r.ok) {
        this.logger.warn(`Nexus answered HTTP ${r.status} for ${metadataUrl}`);
        return null;
      }
      const metadata: any = await r.json();
      const all = [metadata?.latest, ...(Array.isArray(metadata?.versions) ? metadata.versions : [])];
      const listed = all.find((v) => v?.archive_url && archiveFileName(v.archive_url) === archiveFilename);
      return listed ? onNexusBase(listed.archive_url, nexusBase) : null;
    } catch (err: unknown) {
      this.logger.warn(`Nexus pub query failed at ${metadataUrl}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** In-cluster Nexus when NEXUS_INTERNAL_URL is set (see nexus-url.ts). */
  private getNexusBaseUrl(): string {
    return nexusApiBaseUrl((k) => this.configService.get<string>(k));
  }

  private getNexusAuthHeader(): Record<string, string> {
    const user = this.configService.get<string>('NEXUS_ADMIN_USER', 'admin');
    const pass =
      this.configService.get<string>('NEXUS_ADMIN_PASSWORD') ||
      process.env.NEXUS_ADMIN_PASSWORD ||
      '';
    if (!pass) {
      return {};
    }
    const b64 = Buffer.from(`${user}:${pass}`).toString('base64');
    return { Authorization: `Basic ${b64}` };
  }

  /**
   * The public /pub address for archive_url: SUPER_APP_PUB_URL, the same one the
   * build writes into the Super App pubspec.yaml. Never guessed from the request
   * behind the ingress, where X-Forwarded-Proto can be http: `dart pub` sends the
   * token only to URLs under the registered https address, so an http archive
   * link was downloaded without it and failed with "authentication failed".
   */
  private getPublicPubBase(req: Request): string {
    return publicPubBase(this.configService.get<string>('SUPER_APP_PUB_URL'), req);
  }

  private generateLocalFallbackMetadata(packageName: string, req: Request) {
    const publicPubBase = this.getPublicPubBase(req);
    const version = '1.0.0';

    return {
      name: packageName,
      latest: {
        version,
        pubspec: {
          name: packageName,
          version,
          description: 'Official Flutter MiniApp SDK for FSA SuperApp',
          environment: {
            sdk: '>=3.2.0 <4.0.0',
            flutter: '>=3.16.0',
          },
          dependencies: {
            flutter: { sdk: 'flutter' },
          },
        },
        archive_url: `${publicPubBase}/packages/${packageName}/versions/${version}.tar.gz`,
        published: new Date().toISOString(),
      },
      versions: [
        {
          version,
          pubspec: {
            name: packageName,
            version,
            description: 'Official Flutter MiniApp SDK for FSA SuperApp',
            environment: {
              sdk: '>=3.2.0 <4.0.0',
              flutter: '>=3.16.0',
            },
            dependencies: {
              flutter: { sdk: 'flutter' },
            },
          },
          archive_url: `${publicPubBase}/packages/${packageName}/versions/${version}.tar.gz`,
          published: new Date().toISOString(),
        },
      ],
    };
  }
}
