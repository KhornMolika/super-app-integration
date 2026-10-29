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
 * Scoped NPM Registry Gateway Controller (/api/sdk/*)
 *
 * Provides an authenticated, strictly isolated reverse proxy for @fsasuperapp/* packages.
 * External developers configure .npmrc to point to this registry endpoint.
 *
 * Enforces Least Privilege:
 * 1. Authenticates developer using Backoffice JWT or token.
 * 2. Strictly restricts all queries to the '@fsasuperapp/*' scope.
 *    Any query for non-FSA repositories or packages is immediately blocked with 403 Forbidden.
 * 3. Proxies authorized requests to internal Nexus (npm-hosted) and rewrites tarball URLs.
 */
@Controller(['api/sdk', 'sdk'])
export class SdkRegistryProxyController {
  private readonly logger = new Logger(SdkRegistryProxyController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Packument Metadata for scoped packages:
   * Handles:
   *   GET /api/sdk/@fsasuperapp/:pkgName
   *   GET /api/sdk/@fsasuperapp%2F:pkgName
   */
  @Get(':scope/:pkgName')
  async getScopedPackument(
    @Param('scope') scopeParam: string,
    @Param('pkgName') pkgNameParam: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const fullPackageName = `${decodeURIComponent(scopeParam)}/${decodeURIComponent(pkgNameParam)}`;
    this.assertScopeAllowed(fullPackageName);
    this.authenticateRequest(req);
    return this.handlePackument(fullPackageName, req, res);
  }

  /**
   * Tarball Download for scoped packages:
   * Handles:
   *   GET /api/sdk/@fsasuperapp/:pkgName/-/:tarball
   */
  @Get(':scope/:pkgName/-/:tarball')
  async getScopedTarball(
    @Param('scope') scopeParam: string,
    @Param('pkgName') pkgNameParam: string,
    @Param('tarball') tarballParam: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const fullPackageName = `${decodeURIComponent(scopeParam)}/${decodeURIComponent(pkgNameParam)}`;
    this.assertScopeAllowed(fullPackageName);
    this.authenticateRequest(req);
    return this.handleTarball(fullPackageName, tarballParam, res);
  }

  /**
   * Catch-all route for encoded package names:
   * Handles:
   *   GET /api/sdk/@fsasuperapp%2fweb-sdk
   */
  @Get(':encodedPkg')
  async getEncodedPackument(
    @Param('encodedPkg') encodedPkg: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const decoded = decodeURIComponent(encodedPkg);
    this.assertScopeAllowed(decoded);
    this.authenticateRequest(req);
    return this.handlePackument(decoded, req, res);
  }

  /**
   * Least Privilege Enforcement:
   * Strictly permits ONLY packages starting with '@fsasuperapp/'.
   * Rejects any attempt to query internal banking packages or external registries.
   */
  private assertScopeAllowed(packageName: string) {
    const cleanName = (packageName || '').trim().toLowerCase();
    const isFsaScope =
      cleanName.startsWith('@fsasuperapp/') || cleanName === '@fsasuperapp';
    if (!isFsaScope) {
      this.logger.warn(
        `[LeastPrivilege Violation] Blocked unauthorized request for: "${packageName}"`,
      );
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: `Least Privilege Violation: Token is strictly restricted to @fsasuperapp/* packages. Access to package "${packageName}" or internal Nexus repositories is blocked.`,
      });
    }
  }

  /**
   * Authenticates developer via Backoffice Bearer token.
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
        // In production, reject invalid tokens
        if (process.env.NODE_ENV === 'production') {
          throw new UnauthorizedException(
            'Invalid or expired developer token.',
          );
        }
      }
    }

    // In production without token: reject
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException(
        'Authentication required. Please configure _authToken in your .npmrc.',
      );
    }

    // In development mode: allow with warning for local testing
    this.logger.debug(
      'Proceeding in dev mode without verified token for @fsasuperapp package.',
    );
  }

  /**
   * Fetches packument from Nexus npm-hosted repository and rewrites tarball URLs.
   */
  private async handlePackument(
    packageName: string,
    req: Request,
    res: Response,
  ) {
    const nexusBase = this.getNexusBaseUrl();
    const nexusAuth = this.getNexusAuthHeader();

    const shortName = packageName.replace(/^@fsasuperapp\//, '');
    const npmRepo =
      this.configService.get<string>('NEXUS_NPM_SDK_REPO') || 'npm-hosted';
    const upstreamUrl = `${nexusBase}/repository/${npmRepo}/${packageName}`;

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          ...nexusAuth,
          Accept: 'application/json',
        },
      });

      if (upstreamRes.ok) {
        const packument = await upstreamRes.json();
        const publicGatewayUrl = this.getPublicGatewayUrl(req);

        // Rewrite tarball URLs to point back to our /api/sdk gateway
        if (packument.versions && typeof packument.versions === 'object') {
          for (const ver of Object.keys(packument.versions)) {
            const versionObj = packument.versions[ver];
            if (versionObj.dist && versionObj.dist.tarball) {
              const filename = path.basename(versionObj.dist.tarball);
              versionObj.dist.tarball = `${publicGatewayUrl}/@fsasuperapp/${shortName}/-/${filename}`;
            }
          }
        }

        res.setHeader('Content-Type', 'application/json');
        return res.json(packument);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug(
        `Nexus packument query failed at ${upstreamUrl}: ${msg}`,
      );
    }

    // Local workspace fallback (supports dev/POC without running Nexus)
    const localPackument = this.generateLocalFallbackPackument(
      packageName,
      req,
    );
    if (localPackument) {
      res.setHeader('Content-Type', 'application/json');
      return res.json(localPackument);
    }

    throw new NotFoundException(
      `Package "${packageName}" not found in @fsasuperapp repository.`,
    );
  }

  /**
   * Streams package tarball binary from internal Nexus.
   */
  private async handleTarball(
    packageName: string,
    tarballFilename: string,
    res: Response,
  ) {
    const nexusBase = this.getNexusBaseUrl();
    const nexusAuth = this.getNexusAuthHeader();
    const shortName = packageName.replace(/^@fsasuperapp\//, '');
    const npmRepo =
      this.configService.get<string>('NEXUS_NPM_SDK_REPO') || 'npm-hosted';

    const candidateUrls = [
      `${nexusBase}/repository/${npmRepo}/@fsasuperapp/${shortName}/-/${tarballFilename}`,
      `${nexusBase}/repository/${npmRepo}/${packageName}/-/${tarballFilename}`,
    ];

    for (const url of candidateUrls) {
      try {
        const upstreamRes = await fetch(url, {
          headers: nexusAuth,
        });

        if (upstreamRes.ok) {
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${tarballFilename}"`,
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Could not stream tarball from ${url}: ${msg}`);
      }
    }

    throw new NotFoundException(
      `Tarball "${tarballFilename}" not found on repository storage.`,
    );
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

  private getPublicGatewayUrl(req: Request): string {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host =
      req.headers['x-forwarded-host'] ||
      req.get('host') ||
      'app.fintechcenterfsa.com';
    return `${proto}://${host}/api/sdk`;
  }

  /**
   * Generates a local synthetic packument from packages/fsasuperapp-sdk
   * for local testing when Nexus is not initialized.
   */
  private generateLocalFallbackPackument(packageName: string, req: Request) {
    const configuredSdkDir =
      this.configService.get<string>('SDK_PACKAGES_DIR') ||
      process.env.SDK_PACKAGES_DIR;
    const baseDir = configuredSdkDir
      ? path.resolve(process.cwd(), configuredSdkDir)
      : path.resolve(
          this.configService.get<string>('MOBILE_APP_DIR') || '../super-app',
          'packages',
        );

    const pkgJsonPath = path.join(
      baseDir,
      'fsa-superapp-miniapp-web-sdk',
      'package.json',
    );
    if (!fs.existsSync(pkgJsonPath)) return null;

    try {
      const raw = fs.readFileSync(pkgJsonPath, 'utf8');
      const manifest = JSON.parse(raw);
      const publicGatewayUrl = this.getPublicGatewayUrl(req);
      const shortName = packageName.replace(/^@fsasuperapp\//, '');
      const version = manifest.version || '1.0.0';

      return {
        _id: packageName,
        name: packageName,
        'dist-tags': {
          latest: version,
        },
        versions: {
          [version]: {
            name: packageName,
            version: version,
            description: manifest.description || 'FSA SuperApp Web SDK',
            main: manifest.main || 'dist/index.js',
            types: manifest.types || 'dist/index.d.ts',
            dist: {
              tarball: `${publicGatewayUrl}/@fsasuperapp/${shortName}/-/${shortName}-${version}.tgz`,
              shasum: 'synthetic-shasum-fsa-superapp-sdk',
            },
          },
        },
      };
    } catch (_) {
      return null;
    }
  }
}
