import { isPublicAssetKey } from './storage.controller';

describe('isPublicAssetKey (unauthenticated asset routes)', () => {
  it('serves images under public prefixes (logos, org branding, platform, staff avatars)', () => {
    for (const key of [
      'miniapps/abc/logos/logo.png',
      'organizations/fsa/branding/logo.svg',
      'logos/tr.webp',
      'platform/banners/home.jpg',
      'users/backoffice/avatars/u1.jpeg',
      'avatars/u1.png',
    ]) {
      expect(isPublicAssetKey(key)).toBe(true);
    }
  });

  it('refuses everything else in the shared bucket', () => {
    for (const key of [
      'quarantine/packages/pending/app/1.0.0/source.zip', // partner source code
      'pending/app/1.0.0/source.zip',
      'reports/security/app.json',
      'users/end-users/u9/avatar.png', // consumer avatars are owner-only
      'miniapps/abc/packages/build.zip', // non-image under a public prefix
      'miniapps/abc/../../users/end-users/u9/avatar.png', // traversal
      'secret.png', // image outside public prefixes
    ]) {
      expect(isPublicAssetKey(key)).toBe(false);
    }
  });
});
