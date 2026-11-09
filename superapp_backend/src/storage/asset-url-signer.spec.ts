import {
  assetLinkExpiry,
  resetAssetSigningKeyForTests,
  rewriteRawMinioUrl,
  signAssetLink,
  verifyAssetSignature,
} from './asset-url-signer';
import { signAssetLinks } from '../common/interceptors/asset-url-signing.interceptor';

const NOW = Date.UTC(2026, 10, 9, 15, 30); // 2026-11-09 15:30 UTC

function params(link: string) {
  return new URL(link, 'http://x').searchParams;
}

function verifyLink(link: string, nowMs = NOW) {
  const p = params(link);
  return verifyAssetSignature(
    p.get('key') ?? undefined,
    p.get('bucket') ?? '',
    p.get('exp') ?? undefined,
    p.get('sig') ?? undefined,
    nowMs,
  );
}

describe('asset-url-signer', () => {
  beforeAll(() => {
    process.env.ASSET_URL_SECRET = 'test-asset-secret';
    resetAssetSigningKeyForTests();
  });
  afterAll(() => {
    delete process.env.ASSET_URL_SECRET;
    resetAssetSigningKeyForTests();
  });

  it('expires at next UTC midnight + 7 days, so links are stable within a day', () => {
    const exp = assetLinkExpiry(NOW);
    expect(new Date(exp * 1000).toISOString()).toBe('2026-11-17T00:00:00.000Z');
    expect(assetLinkExpiry(NOW + 60 * 60 * 1000)).toBe(exp);
    expect(signAssetLink('/api/storage/asset?key=logos%2Fa.png', NOW)).toBe(
      signAssetLink('/api/storage/asset?key=logos%2Fa.png', NOW + 1000),
    );
  });

  it('signs relative and absolute links, and the signature verifies', () => {
    const rel = signAssetLink('/api/storage/asset?key=logos%2Fa.png', NOW);
    expect(rel.startsWith('/api/storage/asset?key=logos%2Fa.png&exp=')).toBe(true);
    expect(verifyLink(rel)).toBe(true);

    const abs = signAssetLink(
      'https://app.example.com/api/storage/asset?bucket=superapp-storage&key=miniapps%2Fx%2Flogos%2Flogo.png',
      NOW,
    );
    expect(abs.startsWith('https://app.example.com/api/storage/asset?')).toBe(true);
    expect(verifyLink(abs)).toBe(true);
  });

  it('rejects a missing, tampered or expired signature', () => {
    const link = signAssetLink('/api/storage/asset?key=logos%2Fa.png', NOW);
    const p = params(link);
    const exp = p.get('exp')!;
    const sig = p.get('sig')!;
    expect(verifyAssetSignature('logos/a.png', '', exp, sig, NOW)).toBe(true);
    expect(verifyAssetSignature('logos/a.png', '', undefined, undefined, NOW)).toBe(false);
    expect(verifyAssetSignature('logos/b.png', '', exp, sig, NOW)).toBe(false); // other key
    expect(verifyAssetSignature('logos/a.png', 'other', exp, sig, NOW)).toBe(false); // other bucket
    expect(verifyAssetSignature('logos/a.png', '', String(Number(exp) + 1), sig, NOW)).toBe(false);
    expect(verifyAssetSignature('logos/a.png', '', exp, `${sig}x`, NOW)).toBe(false);
    expect(verifyAssetSignature('logos/a.png', '', exp, sig, Number(exp) * 1000 + 1)).toBe(false);
  });

  it('re-signs an already signed link (a client may save it back into the DB)', () => {
    const old = signAssetLink('/api/storage/asset?key=logos%2Fa.png', NOW - 30 * 864e5);
    expect(verifyLink(old)).toBe(false); // expired by now
    const fresh = signAssetLink(old, NOW);
    expect(verifyLink(fresh)).toBe(true);
    expect(params(fresh).getAll('sig')).toHaveLength(1);
  });

  it('a secret change invalidates links', () => {
    const link = signAssetLink('/api/storage/asset?key=logos%2Fa.png', NOW);
    process.env.ASSET_URL_SECRET = 'rotated';
    resetAssetSigningKeyForTests();
    expect(verifyLink(link)).toBe(false);
    process.env.ASSET_URL_SECRET = 'test-asset-secret';
    resetAssetSigningKeyForTests();
  });

  it('rewrites raw MinIO image URLs to signed proxy links, leaves others alone', () => {
    const origins = ['http://10.200.8.6:9000'];
    const out = rewriteRawMinioUrl(
      'http://10.200.8.6:9000/superapp-storage/logos/a.png',
      origins,
      NOW,
    );
    expect(out.startsWith('/api/storage/asset?key=logos%2Fa.png&exp=')).toBe(true);
    expect(verifyLink(out)).toBe(true);

    const zip = 'http://10.200.8.6:9000/superapp-storage/quarantine/packages/a/src.zip';
    expect(rewriteRawMinioUrl(zip, origins, NOW)).toBe(zip);
    const other = 'https://cdn.example.com/logo.png';
    expect(rewriteRawMinioUrl(other, origins, NOW)).toBe(other);
    const presigned = 'http://10.200.8.6:9000/superapp-storage/a.png?X-Amz-Signature=abc';
    expect(rewriteRawMinioUrl(presigned, origins, NOW)).toBe(presigned);
  });
});

describe('signAssetLinks (response interceptor)', () => {
  beforeAll(() => {
    process.env.ASSET_URL_SECRET = 'test-asset-secret';
    resetAssetSigningKeyForTests();
  });

  it('signs links at any depth and leaves other values untouched', () => {
    const when = new Date(NOW);
    const body = {
      success: true,
      data: {
        logo: '/api/storage/asset?key=organizations%2Fo1%2Fbranding%2Flogo.png',
        avatar: 'http://10.200.8.6:9000/superapp-storage/users/backoffice/u1.png',
        name: 'Bank',
        createdAt: when,
        items: [{ logo: 'https://api.x.com/api/storage/asset?bucket=superapp-storage&key=logos%2Fb.png' }],
        description: 'see /api/storage/asset?key=x.png for details', // not a whole link
      },
    };
    const out = signAssetLinks(body, ['http://10.200.8.6:9000'], NOW) as any;
    expect(verifyLink(out.data.logo)).toBe(true);
    expect(verifyLink(out.data.avatar)).toBe(true);
    expect(verifyLink(out.data.items[0].logo)).toBe(true);
    expect(out.data.name).toBe('Bank');
    expect(out.data.createdAt).toBe(when);
    expect(out.data.description).toBe(body.data.description);
    expect(body.data.logo).not.toContain('sig='); // input not mutated
  });
});
