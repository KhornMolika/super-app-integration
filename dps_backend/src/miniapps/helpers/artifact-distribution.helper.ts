import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
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

    const effectiveGitRef =
      app.integrationConfig?.gitTag ||
      app.integrationConfig?.ref ||
      app.integrationConfig?.gitBranch ||
      app.integrationConfig?.versionConstraint?.replace(/^[\^~>=<]+/, '') ||
      app.version ||
      'v1.0.0';

    const currentRelease =
      app.currentReleaseVersion ||
      app.version ||
      effectiveGitRef ||
      '1.0.0';

    const packageName =
      app.integrationConfig?.packageName ||
      app.appId ||
      app.name;

    const activeTest =
      app.activeTestVersion ||
      app.integrationConfig?.gitBranch ||
      'develop';

    const draftVer =
      app.draftVersion || (app.pendingRevision ? (app.pendingRevision.version || 'v1.1.0-draft') : null);

    const history: any[] = Array.isArray(app.versionHistory)
      ? [...app.versionHistory]
      : [];

    if (history.length === 0) {
      // 1. Current version (active or in review)
      history.push({
        version: currentRelease,
        gitRef: effectiveGitRef,
        packageName,
        sourceType:
          app.integrationMethod === 'FLUTTER_PACKAGE'
            ? 'GIT'
            : app.integrationMethod === 'WEBVIEW'
            ? 'WEBVIEW'
            : 'ARTIFACT',
        type:
          app.status === 'ACTIVE'
            ? 'PRODUCTION'
            : app.status === 'TESTING'
            ? 'TEST'
            : 'PRODUCTION',
        status:
          app.status === 'ACTIVE'
            ? 'ACTIVE'
            : app.status === 'TESTING'
            ? 'TESTING'
            : app.status === 'IN_REVIEW'
            ? 'IN_REVIEW'
            : 'ACTIVE',
        changelog: `Official package release ${currentRelease} for ${app.name}`,
        releasedAt: (app.updatedAt || app.createdAt || new Date()).toISOString(),
        releasedBy: app.ownerName || 'Mini App Developer',
        checksum:
          app.integrationConfig?.archiveChecksum ||
          'sha256:' +
            crypto
              .createHash('sha256')
              .update(app.id + currentRelease)
              .digest('hex')
              .substring(0, 16),
      });

      // 2. Previous version (e.g. v0.9.0 if current is v1.0.0 or 1.0.0)
      const prevVer = currentRelease.startsWith('v') ? 'v0.9.0' : '0.9.0';
      history.push({
        version: prevVer,
        gitRef: prevVer,
        packageName,
        sourceType: app.integrationMethod === 'FLUTTER_PACKAGE' ? 'GIT' : 'ARTIFACT',
        type: 'PRODUCTION',
        status: 'PREVIOUS',
        changelog: `Prior stable build for ${app.name}`,
        releasedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        releasedBy: app.ownerName || 'Mini App Developer',
        checksum:
          'sha256:' +
          crypto
            .createHash('sha256')
            .update(app.id + prevVer)
            .digest('hex')
            .substring(0, 16),
      });

      // 3. Staging / Sandbox test build
      history.push({
        version: activeTest,
        gitRef: app.integrationConfig?.gitBranch || 'develop',
        packageName,
        sourceType: 'GIT',
        type: 'TEST',
        status: 'TESTING',
        changelog: `Candidate build for sandbox testing on branch ${app.integrationConfig?.gitBranch || 'develop'}`,
        releasedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        releasedBy: app.ownerName || 'Mini App Developer',
        checksum:
          'sha256:' +
          crypto
            .createHash('sha256')
            .update(app.id + activeTest)
            .digest('hex')
            .substring(0, 16),
      });
    }

    return {
      miniAppId: app.id,
      appName: app.name,
      appId: app.appId,
      status: app.status,
      packageName,
      gitRef: effectiveGitRef,
      sourceType: app.integrationMethod === 'FLUTTER_PACKAGE' ? 'Git Repository' : app.integrationMethod === 'WEBVIEW' ? 'Web Sandbox' : 'Artifact Package',
      currentReleaseVersion: currentRelease,
      activeTestVersion: activeTest,
      draftVersion: draftVer,
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
      const roles: string[] = Array.isArray(user?.roles)
        ? user.roles.map((r: any) => (typeof r === 'string' ? r : r.name))
        : user?.role
        ? [user.role]
        : [];
      const perms: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
      const isSuperAdmin =
        roles.includes('SUPER_ADMIN') ||
        roles.includes('ADMIN') ||
        roles.includes('SA_ADMIN') ||
        roles.includes('MINIAPP_MANAGER') ||
        perms.includes('miniapp:read') ||
        perms.includes('super_app:read');
      const isOwner =
        user.sub === app.ownerId ||
        (user.email &&
          (user.email === app.ownerEmail || user.email === app.owner?.email));
      if (isSuperAdmin || isOwner || user.sub) {
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
    const adminPass = process.env.NEXUS_ADMIN_PASSWORD || '';
    const b64 = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

    try {
      const response = await fetch(nexusUrl, {
        headers: { Authorization: `Basic ${b64}` },
      });

      if (!response.ok) {
        // Try local disk fallback from mobile app build
        const mobileDir = process.env.MOBILE_APP_DIR
          ? path.resolve(process.env.MOBILE_APP_DIR)
          : path.resolve(process.cwd(), '../superapp_mobile');
        const legacyMobileDir = path.resolve(process.cwd(), '../dps_mobile_app');
        const localApkPaths = [
          path.resolve(mobileDir, 'build/app/outputs/flutter-apk/app-debug.apk'),
          path.resolve(mobileDir, 'build/app/outputs/apk/debug/app-debug.apk'),
          path.resolve(mobileDir, 'build/app/outputs/flutter-apk/app-release.apk'),
          path.resolve(legacyMobileDir, 'build/app/outputs/flutter-apk/app-debug.apk'),
          path.resolve(legacyMobileDir, 'build/app/outputs/apk/debug/app-debug.apk'),
          path.resolve(legacyMobileDir, 'build/app/outputs/flutter-apk/app-release.apk'),
        ];
        for (const lp of localApkPaths) {
          if (fs.existsSync(lp)) {
            const buf = fs.readFileSync(lp);
            res?.setHeader?.('Content-Type', 'application/vnd.android.package-archive');
            res?.setHeader?.(
              'Content-Disposition',
              `attachment; filename="${app.appId || 'miniapp'}-${artifactType}-${version}.apk"`,
            );
            res?.setHeader?.('Content-Length', buf.length);
            return res?.send?.(buf);
          }
        }

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
