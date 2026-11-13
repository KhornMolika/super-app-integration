import { archiveFileName, onNexusBase, publicPubBase } from './pub-registry-proxy.controller';

const req = (headers: Record<string, string>, host = 'backend:3000', protocol = 'http') =>
  ({ headers, protocol, get: (k: string) => (k.toLowerCase() === 'host' ? host : undefined) }) as any;

describe('publicPubBase (archive_url of the /pub gateway)', () => {
  it('uses the configured gateway, whatever the ingress forwards (an http link loses the build token)', () => {
    const behindIngress = req({ 'x-forwarded-proto': 'http', 'x-forwarded-host': 'app.fintechcenterfsa.com' });
    expect(publicPubBase('https://app.fintechcenterfsa.com/pub/', behindIngress)).toBe('https://app.fintechcenterfsa.com/pub');
  });

  it('without configuration: the forwarded address, first value only', () => {
    expect(publicPubBase(undefined, req({ 'x-forwarded-proto': 'https,http', 'x-forwarded-host': 'app.example, proxy' }))).toBe(
      'https://app.example/pub',
    );
    expect(publicPubBase('', req({}, 'localhost:3000'))).toBe('http://localhost:3000/pub');
  });
});


describe('archive links from Nexus', () => {
  const internal = 'http://super-app-nexus-svc:8081/nexus';

  it('moves the link Nexus lists onto the internal address, keeping its path', () => {
    expect(
      onNexusBase('http://app.fintechcenterfsa.com/nexus/repository/pub-hosted/api/archives/fsa_hr_miniapp-2.0.0.tar.gz', internal),
    ).toBe(`${internal}/repository/pub-hosted/api/archives/fsa_hr_miniapp-2.0.0.tar.gz`);
    expect(onNexusBase('packages/fsa_hr_miniapp/versions/2.0.0.tar.gz?x=1', `${internal}/`)).toBe(
      `${internal}/repository/pub-hosted/packages/fsa_hr_miniapp/versions/2.0.0.tar.gz?x=1`,
    );
  });

  it('file names ignore the query string', () => {
    expect(archiveFileName('https://h/repository/pub-hosted/a/fsa_hr_miniapp-2.0.0.tar.gz?sig=1')).toBe('fsa_hr_miniapp-2.0.0.tar.gz');
  });
});
