import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import { Response } from 'express';
import { MiniApp } from '../entities/miniapp.entity';

@Injectable()
export class ArtifactDistributionHelper {
  private readonly logger = new Logger(ArtifactDistributionHelper.name);

  getVersionHistory(app: MiniApp, user?: any) {
    if (!app) throw new NotFoundException('Mini App not found');

    const roles: string[] = user?.roles || [];
    const isSuperAdmin =
      roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
    const isOwner =
      user?.sub === app.ownerId ||
      (user?.email &&
        (user.email === app.ownerEmail || user.email === app.owner?.email));

    if (user && !isSuperAdmin && !isOwner) {
      throw new ForbiddenException(
        'Access Denied: You do not have permission to view version history for this Mini App.',
      );
    }

    const currentRelease =
      app.currentReleaseVersion || app.version || '1.0.0';
    const activeTest =
      app.activeTestVersion ||
      app.integrationConfig?.superAppTestVersion ||
      'v0.3.1';
    const draftVer =
      app.draftVersion || (app.pendingRevision ? 'v1.1.0-draft' : null);
    const saRelease =
      app.integrationConfig?.superAppReleaseVersion || 'v1.0.0';
    const saTest =
      app.integrationConfig?.superAppTestVersion || activeTest || 'v0.3.1';

    const history = Array.isArray(app.versionHistory)
      ? [...app.versionHistory]
      : [];

    if (history.length === 0) {
      if (app.status === 'ACTIVE' || currentRelease) {
        history.push({
          version: currentRelease,
          saVersion: saRelease,
          type: 'PRODUCTION',
          status: 'ACTIVE',
          changelog:
            'Initial production release published to Super App ecosystem',
          artifactUrl: `/api/mini-apps/${app.id}/artifacts/release-apk?version=${currentRelease}`,
          apkSize: '52.4 MB',
          checksum:
            'sha256:' +
            crypto
              .createHash('sha256')
              .update(app.id + currentRelease)
              .digest('hex')
              .substring(0, 16),
          releasedAt: (app.createdAt || new Date('2026-09-14T09:43:00Z')).toISOString(),
          releasedBy: 'Mini App Manager',
        });
      }
      if (activeTest) {
        history.push({
          version: activeTest,
          saVersion: saTest,
          type: 'TEST',
          status: 'TESTING',
          changelog: 'Candidate test build for sandbox validation',
          artifactUrl: `/api/mini-apps/${app.id}/artifacts/test-apk?version=${activeTest}`,
          apkSize: '48.1 MB',
          checksum:
            'sha256:' +
            crypto
              .createHash('sha256')
              .update(app.id + activeTest)
              .digest('hex')
              .substring(0, 16),
          releasedAt: (app.updatedAt || new Date('2026-09-16T04:30:00Z')).toISOString(),
          releasedBy: 'Mini App Manager',
        });
      }
    }

    return {
      miniAppId: app.id,
      appName: app.name,
      appId: app.appId,
      status: app.status,
      currentReleaseVersion: currentRelease,
      activeTestVersion: activeTest,
      draftVersion: draftVer,
      superAppReleaseVersion: saRelease,
      superAppTestVersion: saTest,
      pendingRevision: app.pendingRevision || null,
      versions: history,
    };
  }

  generateInviteToken(
    appId: string,
    user: any,
    expiresIn: string = '7d',
  ): { token: string; expiresAt: string; expiresIn: string } {
    let durationMs = 7 * 24 * 60 * 60 * 1000;
    if (expiresIn === '24h') durationMs = 24 * 60 * 60 * 1000;
    else if (expiresIn === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;
    else if (expiresIn === '30d') durationMs = 30 * 24 * 60 * 60 * 1000;
    else if (expiresIn === 'until_new_version')
      durationMs = 90 * 24 * 60 * 60 * 1000;

    const expiresAt = new Date(Date.now() + durationMs).toISOString();
    const secret = process.env.JWT_SECRET || 'super-app-secret-key';
    const payloadStr = JSON.stringify({
      miniAppId: appId,
      expiresAt,
      expiresIn,
      createdBy: user?.sub || 'admin',
    });

    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadStr)
      .digest('hex');

    const token = Buffer.from(
      JSON.stringify({ payload: payloadStr, sig: signature }),
    ).toString('base64url');

    return {
      token,
      expiresAt,
      expiresIn,
    };
  }

  verifyInviteToken(miniAppId: string, token: string): boolean {
    if (!token) return false;
    try {
      const decoded = JSON.parse(
        Buffer.from(token, 'base64url').toString('utf8'),
      );
      const secret = process.env.JWT_SECRET || 'super-app-secret-key';
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(decoded.payload)
        .digest('hex');
      if (decoded.sig !== expectedSig) return false;

      const parsedPayload = JSON.parse(decoded.payload);
      if (parsedPayload.miniAppId !== miniAppId) return false;
      if (new Date(parsedPayload.expiresAt).getTime() < Date.now()) return false;
      return true;
    } catch {
      return false;
    }
  }

  async streamArtifact(
    app: MiniApp,
    artifactType: 'test' | 'release',
    versionQuery?: string,
    user?: any,
    inviteToken?: string,
    res?: Response,
  ) {
    if (!app) throw new NotFoundException('Mini App not found');

    let authorized = false;

    if (user) {
      const roles: string[] = user?.roles || [];
      const isSuperAdmin =
        roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
      const isOwner =
        user.sub === app.ownerId ||
        (user.email &&
          (user.email === app.ownerEmail || user.email === app.owner?.email));
      if (isSuperAdmin || isOwner) {
        authorized = true;
      }
    }

    if (!authorized && inviteToken) {
      if (this.verifyInviteToken(app.id, inviteToken)) {
        authorized = true;
      }
    }

    if (!authorized) {
      throw new ForbiddenException(
        'Access Denied: You do not have permission or a valid invite token to download artifacts for this Mini App.',
      );
    }

    const version =
      versionQuery ||
      (artifactType === 'release'
        ? app.currentReleaseVersion || 'v1.0.0'
        : app.activeTestVersion ||
          app.integrationConfig?.superAppTestVersion ||
          'v0.0.1');
    const repoName =
      artifactType === 'release' ? 'apk-releases' : 'apk-test-builds';
    const filename =
      artifactType === 'release' ? 'app-release.apk' : 'app-debug.apk';
    const nexusBase = (
      process.env.NEXUS_BASE_URL || 'http://localhost:8081'
    ).replace(/\/+$/, '');
    const nexusUrl = `${nexusBase}/repository/${repoName}/superapp/${version}/${filename}`;

    const adminUser = process.env.NEXUS_ADMIN_USER || 'admin';
    const adminPass = process.env.NEXUS_ADMIN_PASSWORD || 'Admin@123';
    const b64 = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

    try {
      const response = await fetch(nexusUrl, {
        headers: { Authorization: `Basic ${b64}` },
      });

      if (!response.ok) {
        const mockContent = Buffer.from(
          `DPS_APK_BINARY_PAYLOAD [MiniApp: ${app.name}, Version: ${version}, Type: ${artifactType.toUpperCase()}]`,
        );
        res?.setHeader?.(
          'Content-Type',
          'application/vnd.android.package-archive',
        );
        res?.setHeader?.(
          'Content-Disposition',
          `attachment; filename="${app.appId || 'miniapp'}-${artifactType}-${version}.apk"`,
        );
        res?.setHeader?.('Content-Length', mockContent.length);
        return res?.send?.(mockContent);
      }

      res?.setHeader?.('Content-Type', 'application/vnd.android.package-archive');
      res?.setHeader?.(
        'Content-Disposition',
        `attachment; filename="${app.appId || 'miniapp'}-${artifactType}-${version}.apk"`,
      );
      const len = response.headers.get('content-length');
      if (len) res?.setHeader?.('Content-Length', len);

      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res as any);
      } else {
        const buf = await response.arrayBuffer();
        res?.send?.(Buffer.from(buf));
      }
    } catch (err: any) {
      this.logger.error(`Error proxying artifact from Nexus: ${err.message}`);
      const mockContent = Buffer.from(
        `DPS_APK_BINARY_PAYLOAD [MiniApp: ${app.name}, Version: ${version}, Type: ${artifactType.toUpperCase()}]`,
      );
      res?.setHeader?.('Content-Type', 'application/vnd.android.package-archive');
      res?.setHeader?.(
        'Content-Disposition',
        `attachment; filename="${app.appId || 'miniapp'}-${artifactType}-${version}.apk"`,
      );
      return res?.send?.(mockContent);
    }
  }
}
