import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

describe('Task 6.1: End-to-End Authentication Verification', () => {
  let app: INestApplication;
  let authService: AuthService;
  const testPassword = process.env.SUPERADMIN_PASSWORD || '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    authService = app.get(AuthService);
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Super Administrator Account (molikakhorn71@gmail.com)', () => {
    it('authenticates successfully against the database with seeded password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'molikakhorn71@gmail.com',
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logged in successfully');
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('expires_in', 900);

      // Verify JWT payload & RS256 signature
      const payload = authService.verifyToken(response.body.access_token, {
        typ: 'back_office',
      });
      expect(payload.email).toBe('molikakhorn71@gmail.com');
      expect(payload.roles).toContain('SUPER_ADMIN');
      expect(payload.permissions).toEqual(
        expect.arrayContaining([
          'user:manage',
          'role:read',
          'miniapp:approve',
          'miniapp:create',
          'organization:manage',
          'settings:manage',
        ]),
      );

      // Verify cookies are dispatched
      const setCookies = response.headers['set-cookie'] || [];
      expect(setCookies.some((c: string) => c.startsWith('auth_token='))).toBe(true);
      expect(setCookies.some((c: string) => c.startsWith('refresh_token='))).toBe(true);
    });
  });

  describe('2. Official Platform Account (lymoly1122@gmail.com)', () => {
    it('authenticates successfully with seeded credentials and role permissions', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'lymoly1122@gmail.com',
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');

      // Verify JWT signature and claims
      const payload = authService.verifyToken(response.body.access_token, {
        typ: 'back_office',
      });
      expect(payload.email).toBe('lymoly1122@gmail.com');
      expect(payload.roles.length).toBeGreaterThan(0);
      expect(payload.permissions).toEqual(
        expect.arrayContaining(['miniapp:read', 'miniapp:create']),
      );
    });
  });

  describe('3. Credential Security & Rejection Gates', () => {
    it('rejects authentication with invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'molikakhorn71@gmail.com',
          password: 'InvalidPassword_999!',
        })
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid email or password',
      });
      expect(response.body).not.toHaveProperty('access_token');
    });

    it('rejects non-existent users', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent-user-test@superapp.gov.kh',
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid credentials or user not found',
      });
    });

    it('rejects malformed login requests via ValidationPipe', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: testPassword,
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'molikakhorn71@gmail.com',
        })
        .expect(400);
    });
  });
});
