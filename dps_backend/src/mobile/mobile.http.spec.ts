import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MailService } from '../notifications/channels/mail.service';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { AuthRateLimitGuard, AuthRateLimiter } from './auth-rate-limiter';
import { EndUserAuthGuard } from './end-user-auth.guard';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { EndUser } from './entities/end-user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { MobileAuthService } from './mobile-auth.service';
import { MobileCatalogService } from './mobile-catalog.service';
import { MobileController } from './mobile.controller';
import { PasswordService } from './password.service';
import { FakeRepo } from './testing/fake-repo';

const PW = 'a-very-good-password';

describe('Mobile HTTP (in-process)', () => {
  let app: INestApplication;
  let server: any;
  let sent: { url: string }[];
  let authService: AuthService;
  let users: FakeRepo<EndUser>;

  beforeEach(async () => {
    sent = [];
    users = new FakeRepo<EndUser>(['email']);
    const miniRows = [
      {
        id: 'm1', appId: 'com.a', name: 'A', shortDescription: 'd', logo: null, category: 'X',
        integrationMethod: 'NATIVE_SDK', integrationConfig: { nexusUrl: 'https://nexus.corp/x' }, ownerEmail: 'o@corp.io',
      },
    ];
    const qb: any = {};
    for (const m of ['select', 'where', 'andWhere', 'orderBy', 'addOrderBy', 'take', 'skip']) qb[m] = () => qb;
    qb.getManyAndCount = async () => [miniRows, 1];
    const authInstance = new AuthService(new JwtService({}), {
      findByEmailWithPermissions: async () => ({ id: 'a', email: 'admin@x.io', name: 'Admin', roles: [{ name: 'R', permissions: [] }] }),
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
        { provide: AuthService, useValue: authInstance },
        { provide: MailService, useValue: { sendEmailVerification: async (_t: string, _n: string, url: string) => void sent.push({ url }) } },
        { provide: getRepositoryToken(EndUser), useValue: users },
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
    expect(JSON.stringify(cat.body)).not.toMatch(/nexus|integrationConfig|corp/);
    const refreshed = await request(server).post(`${prefix}/auth/refresh`).send({ refresh_token: login.refresh_token }).expect(200);
    expect(refreshed.body.refresh_token).not.toBe(login.refresh_token);
    await request(server).post(`${prefix}/auth/logout`).send({ refresh_token: refreshed.body.refresh_token }).expect(204);
    await request(server).post(`${prefix}/auth/refresh`).send({ refresh_token: refreshed.body.refresh_token }).expect(401);
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
    const bo: any = await authService.login({ email: 'admin@x.io' });
    await request(server).get('/mobile/me').set('Authorization', `Bearer ${bo.access_token}`).expect(401);
    // end-user token is refused by the back-office guard
    const boGuard = new JwtAuthGuard(authService);
    expect(() => boGuard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: `Bearer ${login.access_token}` }, query: {} }) }) } as any)).toThrow();
  });
});
