import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const ENV_KEYS = ['JWT_PRIVATE_KEY', 'JWT_KEY_ID', 'JWT_ISSUER', 'NODE_ENV'];

function b64(o: any) {
  return Buffer.from(JSON.stringify(o)).toString('base64url');
}

describe('AuthService / JwtAuthGuard', () => {
  const saved: Record<string, string | undefined> = {};
  let jwt: JwtService;
  let svc: AuthService;
  let guard: JwtAuthGuard;
  let pem: string;

  const make = () => {
    const s = new AuthService(new JwtService({}), {} as any);
    s.onModuleInit();
    return s;
  };
  const ctx = (headers: any = {}, query: any = {}) => {
    const req: any = { headers, query };
    return {
      req,
      ec: {
        switchToHttp: () => ({ getRequest: () => req }),
      } as unknown as ExecutionContext,
    };
  };
  const backOffice = (opts: any = {}) =>
    jwt.sign(
      { sub: 1, typ: 'back_office' },
      {
        privateKey: (svc as any).privateKey,
        algorithm: 'RS256',
        issuer: 'super-app-backend',
        expiresIn: 3600,
        ...opts,
      },
    );

  beforeEach(() => {
    ENV_KEYS.forEach((k) => (saved[k] = process.env[k]));
    pem = crypto
      .generateKeyPairSync('rsa', { modulusLength: 2048 })
      .privateKey.export({ type: 'pkcs8', format: 'pem' })
      .toString();
    process.env.JWT_PRIVATE_KEY = pem;
    delete process.env.JWT_KEY_ID;
    delete process.env.JWT_ISSUER;
    process.env.NODE_ENV = 'test';
    jwt = new JwtService({});
    svc = make();
    guard = new JwtAuthGuard(svc);
  });
  afterEach(() => {
    ENV_KEYS.forEach((k) =>
      saved[k] === undefined
        ? delete process.env[k]
        : (process.env[k] = saved[k]),
    );
  });

  it('accepts a valid back-office token (header and query param)', () => {
    const t = backOffice();
    const a = ctx({ authorization: `Bearer ${t}` });
    expect(guard.canActivate(a.ec)).toBe(true);
    expect(a.req.user.sub).toBe(1);
    const b = ctx({}, { access_token: t });
    expect(guard.canActivate(b.ec)).toBe(true);
    const c = ctx({ authorization: `bearer ${t}` });
    expect(guard.canActivate(c.ec)).toBe(true);
  });

  it('ignores the `token` query param (invite-token collision)', () => {
    expect(() =>
      guard.canActivate(ctx({}, { token: backOffice() }).ec),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a correctly signed token without typ=back_office (allowlist)', () => {
    const t = backOffice();
    const noTyp = jwt.sign(
      { sub: 1 },
      {
        privateKey: (svc as any).privateKey,
        algorithm: 'RS256',
        issuer: 'super-app-backend',
        expiresIn: 60,
      },
    );
    expect(() =>
      guard.canActivate(ctx({ authorization: `Bearer ${noTyp}` }).ec),
    ).toThrow(UnauthorizedException);
    expect(guard.canActivate(ctx({ authorization: `Bearer ${t}` }).ec)).toBe(
      true,
    );
  });

  it('rejects a wrong issuer', () => {
    expect(() => svc.verifyToken(backOffice({ issuer: 'evil' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a missing token', () => {
    expect(() => guard.canActivate(ctx().ec)).toThrow(UnauthorizedException);
  });

  it('rejects a tampered signature', () => {
    const [h, p, s] = backOffice().split('.');
    const bad = `${h}.${p}.${s.slice(0, -4)}${s.endsWith('AAAA') ? 'BBBB' : 'AAAA'}`;
    expect(() => svc.verifyToken(bad)).toThrow(UnauthorizedException);
  });

  it('rejects a tampered payload', () => {
    const [h, , s] = backOffice().split('.');
    const bad = `${h}.${b64({ sub: 999, iss: 'super-app-backend' })}.${s}`;
    expect(() => svc.verifyToken(bad)).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', () => {
    const t = backOffice({ expiresIn: -10 });
    expect(() => svc.verifyToken(t)).toThrow(UnauthorizedException);
  });

  it('rejects alg=none and HS256 signed with the public key', () => {
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 1, iss: 'super-app-backend' })}.`;
    expect(() => svc.verifyToken(none)).toThrow(UnauthorizedException);
    const pub = (svc as any).publicKey as string;
    const h = b64({ alg: 'HS256', typ: 'JWT' });
    const p = b64({ sub: 1, iss: 'super-app-backend' });
    const sig = crypto
      .createHmac('sha256', pub)
      .update(`${h}.${p}`)
      .digest('base64url');
    expect(() => svc.verifyToken(`${h}.${p}.${sig}`)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a forged unsigned decode-only token at the guard', () => {
    const forged = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ sub: 1, permissions: ['*'] })}.c2ln`;
    expect(() =>
      guard.canActivate(ctx({ authorization: `Bearer ${forged}` }).ec),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a token signed by a different key', () => {
    const other = crypto
      .generateKeyPairSync('rsa', { modulusLength: 2048 })
      .privateKey.export({ type: 'pkcs8', format: 'pem' });
    const t = jwt.sign(
      { sub: 1 },
      {
        privateKey: other as string,
        algorithm: 'RS256',
        issuer: 'super-app-backend',
      },
    );
    expect(() => svc.verifyToken(t)).toThrow(UnauthorizedException);
  });

  it('rejects end-user tokens at the back-office guard but they verify with audience/typ', () => {
    const t = svc.signEndUserToken({ sub: 'u1' }, 60);
    expect(() =>
      guard.canActivate(ctx({ authorization: `Bearer ${t}` }).ec),
    ).toThrow(UnauthorizedException);
    const p = svc.verifyToken(t, {
      audience: 'super-app-mobile',
      typ: 'end_user',
    });
    expect(p.typ).toBe('end_user');
    expect(p.aud).toBe('super-app-mobile');
    expect(() =>
      svc.verifyToken(backOffice(), { audience: 'super-app-mobile' }),
    ).toThrow(UnauthorizedException);
    expect(() => svc.verifyToken(backOffice(), { typ: 'end_user' })).toThrow(
      UnauthorizedException,
    );
  });

  it('back-office login tokens verify and expire in 3600s', async () => {
    const s = new AuthService(new JwtService({}), {
      findByEmailWithPermissions: async () => ({
        id: 7,
        email: 'a@b.c',
        name: 'A',
        roles: [{ name: 'r', permissions: [{ name: 'p' }] }],
      }),
    } as any);
    s.onModuleInit();
    const res: any = await s.login({ email: 'a@b.c' });
    const p = s.verifyToken(res.access_token);
    expect(p.iss).toBe('super-app-backend');
    expect(p.exp - p.iat).toBe(3600);
    expect(res.expires_in).toBe(3600);
    expect(p.permissions).toEqual(['p']);
    expect(p.typ).toBe('back_office');
  });

  it('persists the key: same JWKS across instances, kid from env', () => {
    process.env.JWT_KEY_ID = 'k-test';
    const a = make();
    const b = make();
    expect(a.getJwks()).toEqual(b.getJwks());
    expect(a.getJwks().keys[0].kid).toBe('k-test');
    // tokens from one instance verify on the other
    const t = a.signEndUserToken({ sub: 'x' }, 60);
    expect(b.verifyToken(t, { typ: 'end_user' }).sub).toBe('x');
  });

  it('accepts the \\n-escaped single-line PEM form', () => {
    const before = svc.getJwks();
    process.env.JWT_PRIVATE_KEY = pem.trim().replace(/\n/g, '\\n');
    expect(make().getJwks()).toEqual(before);
  });

  it('defaults kid to dps-key-1', () => {
    expect(svc.getJwks().keys[0].kid).toBe('dps-key-1');
  });

  it('generates an ephemeral key outside production, throws in production', () => {
    delete process.env.JWT_PRIVATE_KEY;
    expect(() => make()).not.toThrow();
    process.env.NODE_ENV = 'production';
    expect(() => make()).toThrow(/JWT_PRIVATE_KEY/);
  });

  it('invalid PEM throws without leaking key material', () => {
    process.env.JWT_PRIVATE_KEY = 'SECRETGARBAGE-not-a-pem';
    let msg = '';
    try {
      make();
    } catch (e: any) {
      msg = e.message;
    }
    expect(msg).toMatch(/not a valid PEM/);
    expect(msg).not.toContain('SECRETGARBAGE');
  });

  it('rejects non-RSA keys (EC)', () => {
    process.env.JWT_PRIVATE_KEY = crypto
      .generateKeyPairSync('ec', { namedCurve: 'P-256' })
      .privateKey.export({ type: 'pkcs8', format: 'pem' })
      .toString();
    expect(() => make()).toThrow(/RSA/);
  });

  it('warns when falling back to an ephemeral key', () => {
    delete process.env.JWT_PRIVATE_KEY;
    const { Logger } = require('@nestjs/common');
    const spy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    make();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('EPHEMERAL'));
    spy.mockRestore();
  });
});
