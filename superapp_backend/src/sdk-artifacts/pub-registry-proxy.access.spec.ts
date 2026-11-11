import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PubRegistryProxyController } from './pub-registry-proxy.controller';
import { BACK_OFFICE_TYP } from '../auth/auth.service';

/**
 * Who may read which packages through the /pub gateway: developer tokens get
 * the FSA SDK only; Super App builds (Jenkins callback token, or a Back Office
 * token with super_app:manage) get the mini app packages too.
 */
describe('PubRegistryProxyController access', () => {
  const tokens: Record<string, any> = {
    dev: { sub: 'u1', typ: BACK_OFFICE_TYP, permissions: ['miniapp:read'] },
    admin: { sub: 'u2', typ: BACK_OFFICE_TYP, permissions: ['super_app:manage'] },
    phone: { sub: 'u3', typ: 'end_user', permissions: ['super_app:manage'] },
  };
  const make = (callbackToken = 'ci-secret') =>
    new PubRegistryProxyController(
      { get: (k: string) => (k === 'RELEASE_CALLBACK_TOKEN' ? callbackToken : undefined) } as any,
      {
        verifyToken: (t: string) => {
          if (!tokens[t]) throw new Error('bad token');
          return tokens[t];
        },
      } as any,
    ) as any;
  const req = (token?: string) => ({ headers: token ? { authorization: `Bearer ${token}` } : {}, query: {} }) as any;

  const prevEnv = process.env.NODE_ENV;
  beforeAll(() => (process.env.NODE_ENV = 'production'));
  afterAll(() => (process.env.NODE_ENV = prevEnv));

  const canRead = (c: any, token: string | undefined, pkg: string) => {
    try {
      c.assertPackageAllowed(c.cleanPackageName(pkg), c.authenticateRequest(req(token)));
      return true;
    } catch (e) {
      if (e instanceof ForbiddenException) return false;
      throw e;
    }
  };

  it('a developer token reads the SDK, not mini app packages', () => {
    const c = make();
    expect(canRead(c, 'dev', 'fsa_superapp_miniapp_flutter_sdk')).toBe(true);
    expect(canRead(c, 'dev', 'ma_flutter_kyc')).toBe(false);
  });

  it('the Jenkins callback token reads mini app packages', () => {
    expect(canRead(make(), 'ci-secret', 'ma_flutter_kyc')).toBe(true);
  });

  it('a Back Office token with super_app:manage reads mini app packages', () => {
    expect(canRead(make(), 'admin', 'ma_flutter_kyc')).toBe(true);
  });

  it('a phone (end user) token gets the SDK only, whatever it claims', () => {
    expect(canRead(make(), 'phone', 'ma_flutter_kyc')).toBe(false);
  });

  it('a placeholder callback token opens nothing', () => {
    const c = make('CHANGE_ME_JENKINS_CALLBACK_TOKEN');
    expect(() => c.authenticateRequest(req('CHANGE_ME_JENKINS_CALLBACK_TOKEN'))).toThrow(UnauthorizedException);
  });

  it('no token is refused in production', () => {
    expect(() => make().authenticateRequest(req())).toThrow(UnauthorizedException);
  });

  it('package names cannot reach outside pub-hosted', () => {
    const c = make();
    for (const bad of ['../raw-sdk-artifacts', 'a/b', 'Ma Kyc', '']) {
      expect(() => c.cleanPackageName(bad)).toThrow(NotFoundException);
    }
  });
});
