import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MailService } from '../notifications/channels/mail.service';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../storage/storage.service';
import { AuthRateLimitGuard, AuthRateLimiter } from './auth-rate-limiter';
import { EndUserAuthGuard } from './end-user-auth.guard';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { EndUser } from './entities/end-user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { MobileAccountService } from './mobile-account.service';
import { MobileAppConfigService } from './mobile-app-config.service';
import { MobileAvatarService } from './mobile-avatar.service';
import { MobileAuthService } from './mobile-auth.service';
import { MobileCatalogService } from './mobile-catalog.service';
import { MobileProfileService } from './mobile-profile.service';
import { MobileController } from './mobile.controller';
import { PasswordService } from './password.service';
import { FakeRepo } from './testing/fake-repo';
import { User } from '../access-control/entities/user.entity';
import { hashPassword } from '../common/utils/password.util';
import { PNG, fakeStorage } from './testing/fake-storage';

const PW = 'a-very-good-password';
const ADMIN_PW = 'mock-admin-test-pw';

describe('Mobile HTTP (in-process)', () => {
  let app: INestApplication;
  let server: any;
  let sent: { url: string }[];
  let authService: AuthService;
  let users: FakeRepo<EndUser>;
  let settingValue: unknown;

  beforeEach(async () => {
    sent = [];
    settingValue = undefined;
    users = new FakeRepo<EndUser>(['email']);
    const miniRows = [
      {
        id: 'm1', appId: 'com.a', name: 'A', shortDescription: 'd', logo: null, category: 'X',
        integrationMethod: 'NATIVE_SDK', integrationConfig: { nexusUrl: 'https://nexus.corp/x' }, ownerEmail: 'o@corp.io',
      },
    ];
    const qb: any = {};
    for (const m of ['select', 'where', 'andWhere', 'orderBy', 'addOrderBy', 'take', 'skip', 'leftJoinAndSelect']) qb[m] = () => qb;
    qb.getManyAndCount = async () => [miniRows, 1];
    const adminPasswordHash = await hashPassword(ADMIN_PW);
    const authInstance = new AuthService(new JwtService({}), {
      findByEmailWithPermissions: async () => ({
        id: 'a',
        email: 'admin@x.io',
        name: 'Admin',
        passwordHash: adminPasswordHash,
        isActive: true,
        status: 'ACTIVE',
        roles: [{ name: 'R', permissions: [] }],
      }),
    } as any);
    authInstance.onModuleInit();

    const moduleRef = await Test.createTestingModule({
      controllers: [MobileController],
      providers: [
        PasswordService,
        AuthRateLimiter,
        AuthRateLimitGuard,
        EndUserAuthGuard,
        MobileAuthService,
        MobileCatalogService,
        MobileAppConfigService,
        MobileProfileService,
        MobileAvatarService,
        MobileAccountService,
        { provide: StorageService, useValue: fakeStorage() },
        { provide: SettingsService, useValue: { getSetting: async () => settingValue } },
        { provide: AuthService, useValue: authInstance },
        {
          provide: MailService,
          useValue: {
            sendEmailVerification: async (_t: string, _n: string, url: string) => void sent.push({ url }),
            sendAccountDeletionScheduled: async () => undefined,
          },
        },
        { provide: getRepositoryToken(EndUser), useValue: users },
        { provide: getRepositoryToken(User), useValue: new FakeRepo() },
        { provide: getRepositoryToken(EmailVerificationToken), useValue: new FakeRepo() },
        { provide: getRepositoryToken(RefreshToken), useValue: new FakeRepo() },
        { provide: getRepositoryToken(MiniApp), useValue: { createQueryBuilder: () => qb } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    await app.init();
    server = app.getHttpServer();
    authService = authInstance;
  });
  afterEach(() => app.close());

  const tokenOf = () => new URL(sent[sent.length - 1].url).searchParams.get('token')!;

  async function fullFlow(prefix: string, email = 'jane@example.io') {
    await request(server).post(`${prefix}/auth/register`).send({ email, password: PW, name: 'Jane' }).expect(202);
    await request(server).post(`${prefix}/auth/verify-email`).send({ token: tokenOf(), password: PW }).expect(200);
    const res = await request(server).post(`${prefix}/auth/login`).send({ email, password: PW }).expect(200);
    return res.body;
  }

  it.each(['/mobile', '/api/mobile'])('full flow with statuses under %s', async (prefix) => {
    const login = await fullFlow(prefix);
    expect(login).toMatchObject({ expires_in: 900, user: { email: 'jane@example.io', name: 'Jane' } });
    const auth = { Authorization: `Bearer ${login.access_token}` };
    const me = await request(server).get(`${prefix}/me`).set(auth).expect(200);
    expect(me.body.email).toBe('jane@example.io');
    expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|scrypt/);
    const cat = await request(server).get(`${prefix}/mini-apps?limit=5`).set(auth).expect(200);
    expect(cat.body).toMatchObject({ total: 1, limit: 5, offset: 0 });
    expect(cat.body.items[0]).toHaveProperty('id', 'm1');
    const refreshed = await request(server).post(`${prefix}/auth/refresh`).send({ refresh_token: login.refresh_token }).expect(200);
    expect(refreshed.body.refresh_token).not.toBe(login.refresh_token);
    await request(server).post(`${prefix}/auth/logout`).send({ refresh_token: refreshed.body.refresh_token }).expect(204);
    await request(server).post(`${prefix}/auth/refresh`).send({ refresh_token: refreshed.body.refresh_token }).expect(401);
  });

  it.each(['/mobile', '/api/mobile'])('GET %s/app-config is public, cached and sanitized', async (prefix) => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    try {
      settingValue = { android: { minVersion: '1.2.0', latestVersion: '1.3.0', storeUrl: 'http://bad' } };
      const res = await request(server).get(`${prefix}/app-config`).expect(200);
      expect(res.headers['cache-control']).toBe('public, max-age=300');
      expect(res.body.android).toEqual({ minVersion: '1.2.0', latestVersion: '1.3.0', storeUrl: null });
      expect(res.body.ios.minVersion).toBe('0.0.0');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('android.storeUrl'));
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('http://bad'));
    } finally {
      warn.mockRestore();
    }
  });

  it('PATCH /mobile/me validates, trims, clears and never touches email/status', async () => {
    const login = await fullFlow('/mobile');
    const auth = { Authorization: `Bearer ${login.access_token}` };
    const ok = await request(server)
      .patch('/mobile/me')
      .set(auth)
      .send({ name: ' Jane D ', honorific: 'MRS', position: ' Officer ', staffId: '1870200369', email: 'evil@x.io', status: 'DISABLED' })
      .expect(200);
    expect(ok.body).toMatchObject({ name: 'Jane D', honorific: 'MRS', position: 'Officer', staffId: '1870200369', email: 'jane@example.io', status: 'ACTIVE' });
    const cleared = await request(server).patch('/mobile/me').set(auth).send({ position: '' }).expect(200);
    expect(cleared.body.position).toBeNull();
    await request(server).patch('/mobile/me').set(auth).send({ staffId: 'has space' }).expect(400);
    await request(server).patch('/mobile/me').set(auth).send({ honorific: 'KING' }).expect(400);
    await request(server).patch('/mobile/me').set(auth).send({ name: '   ' }).expect(400);
    await request(server).patch('/mobile/me').send({ name: 'x' }).expect(401);
    const me = await request(server).get('/mobile/me').set(auth).expect(200);
    expect(me.body).toMatchObject({ avatarVersion: null, status: 'ACTIVE' });
    expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|scrypt/);
  });

  it('register with MOBILE_REQUIRE_EMAIL_VERIFICATION=false answers 201 with a session; duplicate is 409', async () => {
    process.env.MOBILE_REQUIRE_EMAIL_VERIFICATION = 'false';
    try {
      const res = await request(server).post('/mobile/auth/register').send({ email: 'new@example.io', password: PW, name: 'New' }).expect(201);
      expect(res.body).toMatchObject({ expires_in: 900, user: { email: 'new@example.io', name: 'New' } });
      const me = await request(server).get('/mobile/me').set('Authorization', `Bearer ${res.body.access_token}`).expect(200);
      expect(me.body.email).toBe('new@example.io');
      expect(sent).toHaveLength(0);
      await request(server).post('/mobile/auth/register').send({ email: 'new@example.io', password: PW, name: 'Dup' }).expect(409);
    } finally {
      delete process.env.MOBILE_REQUIRE_EMAIL_VERIFICATION;
    }
  });

  it('logout with missing/empty/no body is 204', async () => {
    await request(server).post('/mobile/auth/logout').send({}).expect(204);
    await request(server).post('/mobile/auth/logout').send({ refresh_token: '' }).expect(204);
    await request(server).post('/mobile/auth/logout').expect(204);
  });

  it('ValidationPipe: 400 on bad DTOs, whitelist strips extras', async () => {
    await request(server).post('/mobile/auth/register').send({ email: 'not-an-email', password: PW, name: 'J' }).expect(400);
    await request(server).post('/mobile/auth/register').send({ email: 'a@example.io', password: 'short', name: 'J' }).expect(400);
    await request(server).post('/mobile/auth/verify-email').send({ token: 'x' }).expect(400); // password missing
    await request(server).post('/mobile/auth/login').send({ email: 'a@example.io' }).expect(400);
    await request(server).post('/mobile/auth/refresh').send({}).expect(400);
    // extras stripped: `status`/`emailVerifiedAt` never reach the service
    await request(server)
      .post('/mobile/auth/register')
      .send({ email: 'a@example.io', password: PW, name: 'J', status: 'DISABLED', emailVerifiedAt: '2020-01-01' })
      .expect(202);
    expect(users.rows[0].status).toBe('ACTIVE');
    expect(users.rows[0].emailVerifiedAt).toBeNull();
    const t = (await fullFlow('/mobile', 'b@example.io')).access_token;
    await request(server).get('/mobile/mini-apps?limit=500').set('Authorization', `Bearer ${t}`).expect(400);
  });

  it('login: generic 401, then 429 with Retry-After after 5 attempts for one IP+email', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await request(server).post('/mobile/auth/login').send({ email: 'ghost@example.io', password: 'whatever-1234' }).expect(401);
      expect(r.body.message).toBe('Invalid credentials');
    }
    const limited = await request(server).post('/api/mobile/auth/login').send({ email: 'GHOST@example.io', password: 'whatever-1234' }).expect(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('register controller copies the limiter-full 429 into Retry-After', async () => {
    const limiter = app.get(AuthRateLimiter);
    // Guard consumes 1 ip key + 1 ip/email key; leave room for exactly those, so the
    // service's own register-mail key is the one that finds the map full.
    limiter.maxKeys = 2;
    const res = await request(server).post('/mobile/auth/register').send({ email: 'a@example.io', password: PW, name: 'A' }).expect(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(users.rows).toHaveLength(0);
  });

  it('protected routes need an end-user token; back-office/tampered/query tokens are refused', async () => {
    await request(server).get('/mobile/me').expect(401);
    const login = await fullFlow('/mobile');
    await request(server).get(`/mobile/me?access_token=${login.access_token}`).expect(401);
    await request(server).get('/mobile/mini-apps').set('Authorization', `Bearer ${login.access_token}x`).expect(401);
    const bo: any = await authService.login({ email: 'admin@x.io', password: ADMIN_PW });
    expect(bo.access_token).toBeDefined();
    await request(server).get('/mobile/me').set('Authorization', `Bearer ${bo.access_token}`).expect(401);
    // end-user token is refused by the back-office guard
    const boGuard = new JwtAuthGuard(authService);
    expect(() => boGuard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: `Bearer ${login.access_token}` }, query: {} }) }) } as any)).toThrow();
  });

  it('avatar: upload (multipart), owner-only read with ETag/304, size+type limits, delete', async () => {
    const jane = await fullFlow('/mobile');
    const auth = { Authorization: `Bearer ${jane.access_token}` };
    await request(server).get('/mobile/me/avatar').set(auth).expect(404);
    const up = await request(server).post('/mobile/me/avatar').set(auth).attach('file', PNG, { filename: 'me.png', contentType: 'image/png' }).expect(200);
    expect(up.body.avatarVersion).toBeTruthy();
    expect(JSON.stringify(up.body)).not.toContain('avatars/');
    const got = await request(server).get('/mobile/me/avatar').set(auth).buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    }).expect(200);
    expect(got.headers['content-type']).toBe('image/png');
    expect((got.body as Buffer).equals(PNG)).toBe(true);
    await request(server).get('/mobile/me/avatar').set(auth).set('If-None-Match', got.headers.etag).expect(304);
    const bob = await fullFlow('/mobile', 'bob@example.io');
    await request(server).get('/mobile/me/avatar').set('Authorization', `Bearer ${bob.access_token}`).expect(404);
    await request(server).post('/mobile/me/avatar').set(auth).attach('file', Buffer.from('not an image'), { filename: 'x.png', contentType: 'image/png' }).expect(400);
    await request(server).post('/mobile/me/avatar').set(auth).attach('file', Buffer.alloc(2 * 1024 * 1024 + 1, 1), 'big.png').expect(413);
    await request(server).delete('/mobile/me/avatar').set(auth).expect(204);
    await request(server).get('/mobile/me/avatar').set(auth).expect(404);
  });

  it('change password: other sessions die immediately, the new pair works', async () => {
    const realNow = Date.now;
    try {
      const base = realNow();
      Date.now = () => base;
      const a = await fullFlow('/mobile');
      Date.now = () => base + 2000;
      const res = await request(server)
        .post('/mobile/me/password')
        .set('Authorization', `Bearer ${a.access_token}`)
        .send({ currentPassword: PW, newPassword: 'brand-new-password-1' })
        .expect(200);
      await request(server).get('/mobile/me').set('Authorization', `Bearer ${a.access_token}`).expect(401);
      await request(server).post('/mobile/auth/refresh').send({ refresh_token: a.refresh_token }).expect(401);
      await request(server).get('/mobile/me').set('Authorization', `Bearer ${res.body.access_token}`).expect(200);
      await request(server).post('/mobile/auth/login').send({ email: 'jane@example.io', password: 'brand-new-password-1' }).expect(200);
    } finally {
      Date.now = realNow;
    }
  });

  it('delete account: 202, immediate lock-out, sign-in restores with account_restored', async () => {
    const a = await fullFlow('/mobile');
    await request(server).post('/mobile/me/delete').set('Authorization', `Bearer ${a.access_token}`).send({ password: 'wrong-password-x' }).expect(400);
    const del = await request(server).post('/mobile/me/delete').set('Authorization', `Bearer ${a.access_token}`).send({ password: PW }).expect(202);
    expect(new Date(del.body.purgeAfter).getTime()).toBeGreaterThan(Date.now());
    await request(server).get('/mobile/me').set('Authorization', `Bearer ${a.access_token}`).expect(401);
    const back = await request(server).post('/mobile/auth/login').send({ email: 'jane@example.io', password: PW }).expect(200);
    expect(back.body.account_restored).toBe(true);
    await request(server).get('/mobile/me').set('Authorization', `Bearer ${back.body.access_token}`).expect(200);
  });
});
