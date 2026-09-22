import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();

  it('hashes to a self-describing scrypt string with random salt', async () => {
    const a = await svc.hash('correct horse battery');
    const b = await svc.hash('correct horse battery');
    expect(a).toMatch(/^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(a).not.toEqual(b);
    expect(a).not.toContain('correct horse');
    expect(Buffer.from(a.split('$')[5], 'base64')).toHaveLength(64);
    expect(Buffer.from(a.split('$')[4], 'base64')).toHaveLength(16);
  });

  it('verifies the right password and rejects wrong / malformed', async () => {
    const h = await svc.hash('correct horse battery');
    expect(await svc.verify('correct horse battery', h)).toBe(true);
    expect(await svc.verify('wrong horse battery', h)).toBe(false);
    expect(await svc.verify('x', 'garbage')).toBe(false);
    expect(await svc.verify('x', 'scrypt$3$8$1$AAAA$AAAA')).toBe(false); // N not power of 2
    expect(await svc.verify('x', 'scrypt$4294967296$8$1$AAAA$AAAA')).toBe(false);
  });

  it('enforces the password policy', () => {
    expect(svc.validatePolicy('short', 'a@b.co')).toMatch(/at least 10/);
    expect(svc.validatePolicy('x'.repeat(129), 'a@b.co')).toMatch(/at most 128/);
    expect(svc.validatePolicy('User@Example.io', 'user@example.io')).toMatch(/email/);
    expect(svc.validatePolicy('a-fine-password', 'a@b.co')).toBeNull();
    expect(svc.validatePolicy('x'.repeat(10), 'a@b.co')).toBeNull();
    expect(svc.validatePolicy('x'.repeat(128), 'a@b.co')).toBeNull();
  });

  it('measures policy length after NFKC normalisation', () => {
    // 5 x "ﬁ" (U+FB01 ligature) normalise to 10 chars ("fi" x5) -> passes min length
    expect(svc.validatePolicy('\uFB01'.repeat(5), 'a@b.co')).toBeNull();
    // fullwidth email-equal password is caught after normalisation
    expect(svc.validatePolicy('\uFF55\uFF53\uFF45\uFF52\uFF20\uFF45\uFF58\uFF41\uFF4D\uFF50\uFF4C\uFF45\uFF0E\uFF49\uFF4F', 'user@example.io')).toMatch(/email/);
  });

  it('does not cache a failed dummy-hash computation', async () => {
    const s = new PasswordService();
    const spy = jest.spyOn(s, 'hash').mockRejectedValueOnce(new Error('boom'));
    await expect(s.verifyDummy('x')).rejects.toThrow('boom');
    spy.mockRestore();
    await expect(s.verifyDummy('x')).resolves.toBeUndefined();
  });

  it('needsRehash flags weaker parameters', async () => {
    expect(svc.needsRehash(await svc.hash('correct horse battery'))).toBe(false);
    expect(svc.needsRehash('scrypt$16384$8$1$AAAA$AAAA')).toBe(true);
  });
});
