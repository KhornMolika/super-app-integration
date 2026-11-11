import { gzipSync } from 'zlib';
import { cleanArchivePath, readTarGz } from './tar.util';
import { SuperAppWebService } from './superapp-web.service';
import { SuperAppWebController } from './superapp-web.controller';

/** A minimal ustar archive (enough for the reader). */
function tarGz(entries: { name: string; body?: string; type?: string }[]): Buffer {
  const blocks: Buffer[] = [];
  for (const e of entries) {
    const data = Buffer.from(e.body ?? '');
    const h = Buffer.alloc(512);
    h.write(e.name, 0, 100, 'utf8');
    h.write('0000644\0', 100);
    h.write(data.length.toString(8).padStart(11, '0') + '\0', 124);
    h.write(e.type ?? '0', 156);
    h.write('ustar\0', 257);
    blocks.push(h, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

const INDEX = '<html><head><base href="/superapp-sandbox/"></head><body>app</body></html>';

describe('readTarGz', () => {
  it('reads regular files, strips ./ and skips links and paths outside the root', () => {
    const files = readTarGz(
      tarGz([
        { name: './', type: '5' },
        { name: './index.html', body: INDEX },
        { name: './assets/a.json', body: '{}' },
        { name: '../evil.js', body: 'x' },
        { name: '/etc/passwd', body: 'x' },
        { name: './link.js', type: '2' },
      ]),
    );
    expect([...files.keys()]).toEqual(['index.html', 'assets/a.json']);
    expect(files.get('index.html')!.toString()).toBe(INDEX);
  });

  it('cleanArchivePath', () => {
    expect(cleanArchivePath('./a//b.js')).toBe('a/b.js');
    expect(cleanArchivePath('a/../b')).toBeNull();
    expect(cleanArchivePath('a\\b')).toBeNull();
  });
});

describe('SuperAppWebService', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  function mockNexus(latest: any, archive: Buffer | null) {
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: any) => {
      calls.push(String(url));
      if (String(url).endsWith('/latest.json')) {
        return latest === 404 ? new Response('', { status: 404 }) : new Response(JSON.stringify(latest), { status: 200 });
      }
      return archive ? new Response(archive, { status: 200 }) : new Response('', { status: 500 });
    }) as any;
    return calls;
  }
  const config = { get: (k: string) => ({ NEXUS_BASE_URL: 'http://nexus:8081', NEXUS_ADMIN_PASSWORD: 'p' } as any)[k] };

  it('loads the build latest.json names and reuses it until a newer one appears', async () => {
    const calls = mockNexus({ build: 7, archive: 'superapp-web/7/superapp-web.tar.gz' }, tarGz([{ name: './index.html', body: INDEX }]));
    const svc = new SuperAppWebService(config as any);
    const b = await svc.getBuild();
    expect(b!.info.build).toBe(7);
    expect(calls).toEqual([
      'http://nexus:8081/repository/superapp-artifacts/superapp-web/latest.json',
      'http://nexus:8081/repository/superapp-artifacts/superapp-web/7/superapp-web.tar.gz',
    ]);
    await svc.getBuild(); // within a minute: no Nexus call
    expect(calls).toHaveLength(2);
  });

  it('returns null before the first build, and refuses an archive path outside superapp-web', async () => {
    mockNexus(404, null);
    expect(await new SuperAppWebService(config as any).getBuild()).toBeNull();
    mockNexus({ build: 1, archive: '../../secret' }, null);
    expect(await new SuperAppWebService(config as any).getBuild()).toBeNull();
  });
});

describe('SuperAppWebController', () => {
  const files = new Map<string, Buffer>([
    ['index.html', Buffer.from(INDEX)],
    ['main.dart.js', Buffer.from('main()')],
  ]);
  const controller = (build: any) => new SuperAppWebController({ getBuild: async () => build } as any);
  const build = { info: { build: 9, archive: 'superapp-web/9/superapp-web.tar.gz' }, files };

  function res() {
    const r: any = { headers: {} as Record<string, string> };
    r.status = jest.fn((c: number) => ((r.code = c), r));
    r.type = jest.fn((t: string) => ((r.headers['Content-Type'] = t), r));
    r.set = jest.fn((k: string, v: string) => ((r.headers[k] = v), r));
    r.send = jest.fn((b: any) => ((r.body = Buffer.isBuffer(b) ? b.toString() : b), r));
    return r;
  }
  const req = (path: string, base?: string) => ({ path, headers: base ? { 'x-superapp-web-base': base } : {} }) as any;

  it('serves index.html with the base path of the place it is shown', async () => {
    const r = res();
    await controller(build).file(req('/superapp-web/home/wallet', '/preview/'), r);
    expect(r.code).toBe(200);
    expect(r.body).toContain('<base href="/preview/">');
    expect(r.headers['Cache-Control']).toBe('no-cache');
  });

  it('ignores an unsafe base header', async () => {
    const r = res();
    await controller(build).root(req('/superapp-web/', '"><script>'), r);
    expect(r.body).toContain('<base href="/superapp-web/">');
  });

  it('serves files, 404 for missing files, 503 before the first build', async () => {
    let r = res();
    await controller(build).file(req('/superapp-web/main.dart.js'), r);
    expect(r.body).toBe('main()');
    expect(r.headers['Content-Type']).toContain('javascript');
    r = res();
    await controller(build).file(req('/superapp-web/missing.js'), r);
    expect(r.code).toBe(404);
    r = res();
    await controller(build).file(req('/superapp-web/%E0%A4%A'), r);
    expect(r.code).toBe(200); // bad encoding: treated as an app route
    r = res();
    await controller(null).root(req('/superapp-web/'), r);
    expect(r.code).toBe(503);
  });
});
