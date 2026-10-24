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
import { AuthService } from '../auth/auth.service';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

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
 * Enforces Least Privilege:
 * 1. Authenticates developer via Bearer token (from `dart pub token add`).
 * 2. Strictly restricts queries to `fsa_superapp_flutter*` packages.
 *    Any query for non-FSA packages is immediately blocked with 403 Forbidden.
 * 3. Proxies authorized requests to internal Nexus (pub-hosted) and rewrites archive URLs.
 */
@Controller('pub')
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
    const cleanName = (packageName || '').trim().toLowerCase();
    this.assertPackageAllowed(cleanName);
    this.authenticateRequest(req);
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
    const cleanName = (packageName || '').trim().toLowerCase();
    this.assertPackageAllowed(cleanName);
    this.authenticateRequest(req);
    return this.handleArchive(cleanName, versionArchive, res);
  }

  /**
   * Least Privilege Enforcement:
   * Strictly permits ONLY official FSA Flutter SDK packages.
   * Rejects any attempt to query internal banking packages or probe other repositories.
   */
  private assertPackageAllowed(packageName: string) {
    if (!this.allowedPackages.has(packageName) && !packageName.startsWith('fsa_superapp_flutter')) {
      this.logger.warn(`[LeastPrivilege Violation] Blocked unauthorized Pub request for: "${packageName}"`);
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: `Least Privilege Violation: Token is strictly restricted to official FSA Flutter packages. Access to package "${packageName}" or internal repositories is blocked.`,
      });
    }
  }

  /**
   * Authenticates developer via Bearer token.
   */
  private authenticateRequest(req: Request) {
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
      try {
        const payload = this.authService.verifyToken(token);
        req['user'] = payload;
        return;
      } catch (err: unknown) {
        if (process.env.NODE_ENV === 'production') {
          throw new UnauthorizedException('Invalid or expired developer token.');
        }
      }
    }

    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException(
        'Authentication required. Please configure your token with `dart pub token add https://app.fintechcenterfsa.com/pub`.',
      );
    }

    this.logger.debug('Proceeding in dev mode without verified token for Flutter package.');
  }

  /**
   * Fetches package metadata from Nexus pub-hosted repository and rewrites archive URLs.
   */
  private async handleMetadata(packageName: string, req: Request, res: Response) {
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
        const metadata = (await upstreamRes.json()) as any;
        const publicPubBase = this.getPublicPubBase(req);

        // Rewrite archive_url to point back to our /pub gateway
        if (metadata.latest && metadata.latest.archive_url) {
          const filename = path.basename(metadata.latest.archive_url);
          metadata.latest.archive_url = `${publicPubBase}/packages/${packageName}/versions/${filename}`;
        }

        if (Array.isArray(metadata.versions)) {
          for (const ver of metadata.versions) {
            if (ver.archive_url) {
              const filename = path.basename(ver.archive_url);
              ver.archive_url = `${publicPubBase}/packages/${packageName}/versions/${filename}`;
            }
          }
        }

        res.setHeader('Content-Type', 'application/vnd.pub.v2+json');
        return res.json(metadata);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug(`Nexus pub query failed at ${upstreamUrl}: ${msg}`);
    }

    // Local workspace fallback (supports dev/POC without running Nexus)
    const localMetadata = this.generateLocalFallbackMetadata(packageName, req);
    if (localMetadata) {
      res.setHeader('Content-Type', 'application/vnd.pub.v2+json');
      return res.json(localMetadata);
    }

    throw new NotFoundException(`Flutter package "${packageName}" not found on repository storage.`);
  }

  /**
   * Streams package archive (.tar.gz) from internal Nexus.
   */
  private async handleArchive(packageName: string, archiveFilename: string, res: Response) {
    const nexusBase = this.getNexusBaseUrl();
    const nexusAuth = this.getNexusAuthHeader();
    const upstreamUrl = `${nexusBase}/repository/pub-hosted/packages/${packageName}/versions/${archiveFilename}`;

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        headers: nexusAuth,
      });

      if (upstreamRes.ok) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${archiveFilename}"`);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug(`Could not stream archive from ${upstreamUrl}: ${msg}`);
    }

    throw new NotFoundException(`Archive "${archiveFilename}" not found on repository storage.`);
  }

  private getNexusBaseUrl(): string {
    return (
      this.configService.get<string>('NEXUS_BASE_URL') ||
      process.env.NEXUS_BASE_URL ||
      'http://localhost:8081'
    ).replace(/\/+$/, '');
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

  private getPublicPubBase(req: Request): string {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'app.fintechcenterfsa.com';
    return `${proto}://${host}/pub`;
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
