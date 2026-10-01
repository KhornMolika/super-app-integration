import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'test';
  const rawVersion = searchParams.get('version') || 'latest';
  const appName = searchParams.get('appName') || 'superapp';

  const repoName = type === 'release' ? 'apk-releases' : 'apk-test-builds';
  const primaryFilename = type === 'release' ? 'app-release.apk' : 'app-release.apk';
  const altFilename = 'app-debug.apk';

  const versionCandidates = [
    rawVersion,
    rawVersion === 'latest' ? 'latest' : rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`,
    rawVersion.replace(/^v/, ''),
    'latest',
    'v0.1.3',
    'v0.0.1',
  ];

  const nexusBase = (
    process.env.NEXUS_BASE_URL ||
    process.env.NEXUS_URL ||
    'http://localhost:8081'
  ).replace(/\/+$/, '');
  const adminUser = process.env.NEXUS_ADMIN_USER || 'admin';
  const adminPass = process.env.NEXUS_ADMIN_PASSWORD || 'admin123';
  const b64 = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

  // 1. PRIORITIZE STREAMING DIRECTLY FROM NEXUS REGISTRY (Single Source of Truth)
  for (const ver of versionCandidates) {
    for (const fn of [primaryFilename, altFilename]) {
      const nexusUrl = `${nexusBase}/repository/${repoName}/${appName}/${ver}/${fn}`;
      try {
        const res = await fetch(nexusUrl, {
          cache: 'no-store',
          headers: { Authorization: `Basic ${b64}` },
        });

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
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
          headers.set('Content-Length', String(buffer.length));
          headers.set('X-APK-Source', 'Nexus-Repository');

          return new NextResponse(buffer, { status: 200, headers });
        }
      } catch (_) {}
    }
  }

  // 2. NEXUS REST ASSETS SEARCH (Search newest uploaded blob in repo)
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
            const arrayBuffer = await latestRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
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
            headers.set('Content-Length', String(buffer.length));
            headers.set('X-APK-Source', 'Nexus-Rest-Asset');

            return new NextResponse(buffer, { status: 200, headers });
          }
        }
      }
    }
  } catch (_) {}

  // 3. FALLBACK TO LOCAL DISK (If Nexus is offline or local build cache exists)
  const publicDir = path.resolve(process.cwd(), 'public');
  const mobileDir = process.env.MOBILE_APP_DIR
    ? path.resolve(process.env.MOBILE_APP_DIR)
    : path.resolve(process.cwd(), '../super-app');

  const localCandidates = [
    path.resolve(publicDir, 'superapp-test.apk'),
    path.resolve(publicDir, 'superapp-release.apk'),
    path.resolve(mobileDir, 'build/app/outputs/flutter-apk/app-release.apk'),
    path.resolve(mobileDir, 'build/app/outputs/flutter-apk/app-debug.apk'),
  ];

  for (const localPath of localCandidates) {
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      const fileBuffer = fs.readFileSync(localPath);
      const downloadFilename = `superapp-${type}-${rawVersion}.apk`;

      const headers = new Headers();
      headers.set('Content-Type', 'application/vnd.android.package-archive');
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      headers.set('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      headers.set('Content-Length', String(stats.size));
      headers.set('X-APK-Source', 'Local-Disk-Fallback');

      return new NextResponse(fileBuffer, { status: 200, headers });
    }
  }

  // 4. Return Simulated APK Payload if neither Nexus nor local build is available
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
