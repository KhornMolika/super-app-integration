import { NexusIntegrationService } from './nexus-integration.service';

const AdmZip = require('adm-zip');

const INTERNAL = 'http://super-app-nexus-svc.super-app.svc.cluster.local:8081/nexus';
const PUBLIC_HTTP = 'http://app.fintechcenterfsa.com/nexus';

function service(extra: Record<string, string> = {}) {
  const env: Record<string, string> = {
    ...extra,
    NEXUS_INTERNAL_URL: INTERNAL,
    NEXUS_BASE_URL: 'https://app.fintechcenterfsa.com/nexus',
    NEXUS_ADMIN_USER: 'admin',
    NEXUS_ADMIN_PASSWORD: 'test-only-password',
  };
  const config: any = { get: (k: string, d?: any) => env[k] ?? d };
  return new NexusIntegrationService(config);
}

function zip(): Buffer {
  const z = new AdmZip();
  z.addFile('pubspec.yaml', Buffer.from('name: fsa_hr_miniapp\nversion: 1.2.0\n'));
  z.addFile('lib/fsa_hr_miniapp.dart', Buffer.from('library x;'));
  return z.toBuffer();
}

describe('publishPubArchive: links Nexus returns with its public Base URL', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('uploads and finishes on our own Nexus address, not the public http one', async () => {
    const calls: Array<{ url: string; method: string; redirect?: string }> = [];
    global.fetch = jest.fn(async (url: any, init: any = {}) => {
      calls.push({ url: String(url), method: init.method || 'GET', redirect: init.redirect });
      if (String(url).endsWith('/versions/new')) {
        return new Response(JSON.stringify({ url: `${PUBLIC_HTTP}/repository/pub-hosted/api/packages/versions/newUpload`, fields: {} }), { status: 200 });
      }
      if (String(url).endsWith('/versions/newUpload')) {
        return new Response(null, {
          status: 302,
          headers: { location: `${PUBLIC_HTTP}/repository/pub-hosted/api/packages/versions/newUploadFinish?upload_id=7` },
        });
      }
      return new Response(JSON.stringify({ success: { message: 'ok' } }), { status: 200 });
    }) as any;

    await service().publishPubArchive(zip(), 'fsa_hr_miniapp', '1.2.0');

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `GET ${INTERNAL}/repository/pub-hosted/api/packages/versions/new`,
      `POST ${INTERNAL}/repository/pub-hosted/api/packages/versions/newUpload`,
      `GET ${INTERNAL}/repository/pub-hosted/api/packages/versions/newUploadFinish?upload_id=7`,
    ]);
    expect(calls[1].redirect).toBe('manual');
  });

  it('uses the in-cluster address even when NEXUS_PUB_HOSTED_URL is the public one (prod config)', async () => {
    const urls: string[] = [];
    global.fetch = jest.fn(async (url: any) => {
      urls.push(String(url));
      return String(url).endsWith('/versions/new')
        ? new Response(JSON.stringify({ url: `${PUBLIC_HTTP}/repository/pub-hosted/api/packages/versions/newUpload` }), { status: 200 })
        : new Response(null, { status: 204 });
    }) as any;

    await service({
      NEXUS_PUB_HOSTED_URL: 'https://app.fintechcenterfsa.com/nexus/repository/pub-hosted',
    }).publishPubArchive(zip(), 'fsa_hr_miniapp', '1.2.0');

    expect(urls.every((u) => u.startsWith(INTERNAL))).toBe(true);
  });

  it('reports a refused upload without a whole HTML page', async () => {
    global.fetch = jest.fn(async (url: any) =>
      String(url).endsWith('/versions/new')
        ? new Response(JSON.stringify({ url: '/repository/pub-hosted/api/packages/versions/newUpload' }), { status: 200 })
        : new Response('<html><head><title>404 - Sonatype Nexus Repository</title></head><body>Not Found</body></html>', { status: 404 }),
    ) as any;

    await expect(service().publishPubArchive(zip(), 'fsa_hr_miniapp', '1.2.0')).rejects.toThrow(
      /newUpload failed with HTTP 404: 404 - Sonatype Nexus Repository Not Found$/,
    );
  });
});
