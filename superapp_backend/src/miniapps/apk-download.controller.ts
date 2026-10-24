import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { BypassTransform } from '../common/decorators/bypass-transform.decorator';

@BypassTransform()
@Controller(['download-apk', 'api/download-apk'])
export class ApkDownloadController {
  private readonly logger = new Logger(ApkDownloadController.name);

  @Get()
  async downloadApkByQuery(
    @Query('type') typeQuery: string,
    @Query('version') versionQuery: string,
    @Query('appName') appNameQuery: string,
    @Res() res: Response,
  ) {
    return this.handleStreamApk(typeQuery, versionQuery, res);
  }

  @Get(':filename')
  async downloadApkByFilename(
    @Param('filename') filenameParam: string,
    @Res() res: Response,
  ) {
    const match = filenameParam?.match(/superapp-(test|release)-(v?\d+\.\d+\.\d+)\.apk/i);
    const type = match ? match[1].toLowerCase() : 'test';
    const version = match ? match[2] : 'v0.2.5';
    return this.handleStreamApk(type, version, res);
  }

  private async handleStreamApk(
    typeQuery: string | undefined,
    versionQuery: string | undefined,
    res: Response,
  ) {
    const isRelease = typeQuery === 'release';
    const repoName = isRelease ? 'apk-releases' : 'apk-test-builds';
    const rawVer = (versionQuery || 'v0.2.5').trim();
    const normVer = rawVer.startsWith('v') ? rawVer : `v${rawVer}`;
    const standardizedFilename = isRelease
      ? `superapp-release-${normVer}.apk`
      : `superapp-test-${normVer}.apk`;

    const nexusBase = (
      process.env.NEXUS_BASE_URL ||
      process.env.NEXUS_URL ||
      'http://localhost:8081'
    ).replace(/\/+$/, '');

    const nexusUser =
      process.env.NEXUS_ADMIN_USER ||
      process.env.NEXUS_USER ||
      process.env.NEXUS_USERNAME ||
      'admin';
    const nexusPass =
      process.env.NEXUS_ADMIN_PASSWORD ||
      process.env.NEXUS_PASSWORD ||
      '';
    const b64 = nexusPass
      ? Buffer.from(`${nexusUser}:${nexusPass}`).toString('base64')
      : '';

    const primaryFilename = isRelease ? 'app-release.apk' : 'app-release.apk';
    const altFilename = 'app-debug.apk';

    const candidateUrls = [
      `${nexusBase}/repository/${repoName}/superapp/${normVer}/${standardizedFilename}`,
      `${nexusBase}/repository/${repoName}/superapp/${normVer}/${primaryFilename}`,
      `${nexusBase}/repository/${repoName}/superapp/${normVer}/${altFilename}`,
      `${nexusBase}/repository/${repoName}/superapp/latest/${primaryFilename}`,
      `${nexusBase}/repository/${repoName}/superapp/latest/${altFilename}`,
    ];

    for (const url of candidateUrls) {
      try {
        const headers: Record<string, string> = { cache: 'no-store' };
        if (b64) {
          headers['Authorization'] = `Basic ${b64}`;
        }
        const upstreamRes = await fetch(url, {
          headers,
          cache: 'no-store',
        });

        if (upstreamRes.ok) {
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${standardizedFilename}"`,
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
        this.logger.debug(`Could not stream from ${url}: ${msg}`);
      }
    }

    // Local disk fallback
    const localFallbackPath = path.resolve(
      process.cwd(),
      '../superapp_backoffice/public/superapp-test.apk',
    );
    if (fs.existsSync(localFallbackPath)) {
      const stats = fs.statSync(localFallbackPath);
      const buf = fs.readFileSync(localFallbackPath);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${standardizedFilename}"`,
      );
      res.setHeader('Content-Length', stats.size);
      return res.send(buf);
    }

    // Real artifact check: If not found on Nexus or disk, return 404
    this.logger.warn(
      `APK artifact "${standardizedFilename}" (version ${normVer}) not found on Nexus or local storage.`,
    );
    res.setHeader('Content-Type', 'application/json');
    return res.status(404).json({
      statusCode: 404,
      error: 'Not Found',
      message: `APK binary "${standardizedFilename}" not found on repository storage. Please verify CI/CD build completion.`,
    });
  }
}
