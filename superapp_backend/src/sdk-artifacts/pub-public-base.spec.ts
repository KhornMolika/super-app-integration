import { publicPubBase } from './pub-registry-proxy.controller';

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
