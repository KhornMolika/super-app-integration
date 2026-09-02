import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'test';
  const version = searchParams.get('version') || 'v1.1.0';
  const appName = searchParams.get('appName') || 'superapp';

  const repoName = type === 'release' ? 'apk-releases' : 'apk-test-builds';
  const filename = type === 'release' ? 'app-release.apk' : 'app-debug.apk';
  const nexusUrl = `http://localhost:8081/repository/${repoName}/${appName}/${version}/${filename}`;

  try {
    const res = await fetch(nexusUrl, { cache: 'no-store' });
    if (!res.ok) {
      return new NextResponse(`Artifact not found in Nexus: ${res.statusText}`, { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.android.package-archive');
    headers.set('Content-Disposition', `attachment; filename="${appName}-${type}-${version}.apk"`);
    const contentLength = res.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(res.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return new NextResponse(`Error retrieving build from Nexus: ${error.message}`, { status: 500 });
  }
}
