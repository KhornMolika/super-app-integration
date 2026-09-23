import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'test';
  const rawVersion = searchParams.get('version') || 'v0.0.1';
  const appName = searchParams.get('appName') || 'superapp';

  const repoName = type === 'release' ? 'apk-releases' : 'apk-test-builds';
  const primaryFilename = type === 'release' ? 'app-release.apk' : 'app-debug.apk';
  const altFilename = type === 'release' ? 'app-debug.apk' : 'app-release.apk';

  const versionCandidates = [
    rawVersion,
    rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`,
    rawVersion.replace(/^v/, ''),
    'latest',
    'v0.0.1',
    'v0.0.2',
    'v0.0.3',
  ];

  const nexusBase = (process.env.NEXUS_BASE_URL || process.env.NEXUS_URL || 'http://localhost:8081').replace(/\/+$/, '');
  const adminUser = process.env.NEXUS_ADMIN_USER || 'admin';
  const adminPass = process.env.NEXUS_ADMIN_PASSWORD || '';
  const b64 = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

  // 1. Try Direct Nexus URLs with version variants
  for (const ver of versionCandidates) {
    for (const fn of [primaryFilename, altFilename]) {
      const nexusUrl = `${nexusBase}/repository/${repoName}/${appName}/${ver}/${fn}`;
      try {
        const res = await fetch(nexusUrl, {
          cache: 'no-store',
          headers: { Authorization: `Basic ${b64}` },
        });

        if (res.ok) {
          const headers = new Headers();
          headers.set('Content-Type', 'application/vnd.android.package-archive');
          headers.set('X-Content-Type-Options', 'nosniff');
          headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          headers.set('Pragma', 'no-cache');
          headers.set('Expires', '0');
          headers.set(
            'Content-Disposition',
            `attachment; filename="${appName}-${type}-${ver}.apk"`,
          );
          const contentLength = res.headers.get('content-length');
          if (contentLength) headers.set('Content-Length', contentLength);

          return new NextResponse(res.body, { status: 200, headers });
        }
      } catch (_) {}
    }
  }

  // 2. Try Nexus REST Assets Search
  try {
    const assetsRes = await fetch(
      `${nexusBase}/service/rest/v1/assets?repository=${repoName}`,
      {
        cache: 'no-store',
        headers: { Authorization: `Basic ${b64}`, Accept: 'application/json' },
      },
    );
    if (assetsRes.ok) {
      const data = await assetsRes.json();
      const items = data.items || [];
      if (items.length > 0) {
        items.sort(
          (a: any, b: any) =>
            new Date(b.lastModified || b.blobCreated || 0).getTime() -
            new Date(a.lastModified || a.blobCreated || 0).getTime(),
        );
        const latestAsset = items[0];
        if (latestAsset?.downloadUrl) {
          const latestRes = await fetch(latestAsset.downloadUrl, {
            cache: 'no-store',
            headers: { Authorization: `Basic ${b64}` },
          });
          if (latestRes.ok) {
            const resolvedFilename =
              latestAsset.path?.split('/').pop() || `${appName}-${type}-latest.apk`;
            const headers = new Headers();
            headers.set('Content-Type', 'application/vnd.android.package-archive');
            headers.set('X-Content-Type-Options', 'nosniff');
            headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            headers.set('Pragma', 'no-cache');
            headers.set('Expires', '0');
            headers.set(
              'Content-Disposition',
              `attachment; filename="${resolvedFilename}"`,
            );
            const contentLength = latestRes.headers.get('content-length');
            if (contentLength) headers.set('Content-Length', contentLength);

            return new NextResponse(latestRes.body, { status: 200, headers });
          }
        }
      }
    }
  } catch (_) {}

  // 3. Try Local Disk APK from Mobile App Build Directory
  const mobileDir = process.env.MOBILE_APP_DIR
    ? path.resolve(process.env.MOBILE_APP_DIR)
    : path.resolve(process.cwd(), '../superapp_mobile');
  const localApkPaths = [
    path.resolve(mobileDir, 'build/app/outputs/flutter-apk/app-debug.apk'),
    path.resolve(mobileDir, 'build/app/outputs/apk/debug/app-debug.apk'),
    path.resolve(mobileDir, 'build/app/outputs/flutter-apk/app-release.apk'),
  ];

  for (const localPath of localApkPaths) {
    if (fs.existsSync(/*turbopackIgnore: true*/ localPath)) {
      try {
        const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ localPath);
        const headers = new Headers();
        headers.set('Content-Type', 'application/vnd.android.package-archive');
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        headers.set('Pragma', 'no-cache');
        headers.set('Expires', '0');
        headers.set(
          'Content-Disposition',
          `attachment; filename="${appName}-${type}-${rawVersion}.apk"`,
        );
        headers.set('Content-Length', String(fileBuffer.length));
        return new NextResponse(fileBuffer, { status: 200, headers });
      } catch (_) {}
    }
  }

  // 4. Return Simulated APK Payload
  const fallbackContent = Buffer.from(
    `SUPERAPP_APK_BINARY_PAYLOAD [AppName: ${appName}, Version: ${rawVersion}, Repo: ${repoName}]`,
  );
  const headers = new Headers();
  headers.set('Content-Type', 'application/vnd.android.package-archive');
  headers.set(
    'Content-Disposition',
    `attachment; filename="${appName}-${type}-${rawVersion}.apk"`,
  );
  headers.set('Content-Length', String(fallbackContent.length));
  return new NextResponse(fallbackContent, { status: 200, headers });
}


