import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/access-control/entities/user.entity';
import { Role } from '../src/access-control/entities/role.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { MiniApp, MiniAppStatus } from '../src/miniapps/entities/miniapp.entity';
import { Repository } from 'typeorm';
import { hashPassword } from '../src/common/utils/password.util';
import { SourceType } from '../src/miniapps/dto/create-miniapp.dto';

describe('End-to-End Home Widget Feature Testing (M5/Step 4)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let userRepo: Repository<User>;
  let roleRepo: Repository<Role>;
  let orgRepo: Repository<Organization>;
  let miniAppRepo: Repository<MiniApp>;

  let testAdminUser: User;
  let adminToken: string;
  let testOrg: Organization;
  const createdAppIds: string[] = [];

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
    userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    roleRepo = app.get<Repository<Role>>(getRepositoryToken(Role));
    orgRepo = app.get<Repository<Organization>>(getRepositoryToken(Organization));
    miniAppRepo = app.get<Repository<MiniApp>>(getRepositoryToken(MiniApp));

    // Resolve test organization and role
    testOrg = (await orgRepo.findOne({ where: { code: 'FTC' } }))!;
    if (!testOrg) {
      testOrg = await orgRepo.save(
        orgRepo.create({
          name: 'FinTech Center Test Org',
          code: 'FTC',
          type: 'REGULATOR',
          status: 'ACTIVE',
        }),
      );
    }

    let adminRole = await roleRepo.findOne({ where: { name: 'SUPER_ADMIN' } });
    if (!adminRole) {
      adminRole = await roleRepo.findOne({ where: { name: 'ADMIN' } });
    }
    if (!adminRole) {
      adminRole = (await roleRepo.find())[0];
    }

    const testPassword = 'TestHomeWidgetPass_2026!';
    const pwHash = await hashPassword(testPassword);

    testAdminUser = await userRepo.save(
      userRepo.create({
        email: `hw.admin.${Date.now()}@ftc.gov.kh`,
        name: 'Home Widget Test Admin',
        roleId: adminRole!.id,
        role: adminRole!,
        organizationId: testOrg.id,
        organization: testOrg,
        passwordHash: pwHash,
        status: 'ACTIVE',
        isActive: true,
      }),
    );

    const loginRes: any = await authService.login({
      email: testAdminUser.email,
      password: testPassword,
    });
    adminToken = loginRes.access_token;
  }, 30000);

  afterAll(async () => {
    // Self-cleaning: remove all mini-apps created during the test
    for (const id of createdAppIds) {
      try {
        await miniAppRepo.delete({ id });
      } catch {}
    }
    if (testAdminUser?.id) {
      try {
        await userRepo.delete({ id: testAdminUser.id });
      } catch {}
    }
    await app.close();
  });

  describe('1. Home Widget Input Validation (Rejection Scenarios)', () => {
    it('rejects FLUTTER_PACKAGE with lowercase class name', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/miniapps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          appId: `com.test.hw.invalid1.${Date.now()}`,
          name: 'Invalid Class MiniApp',
          integrationMethod: 'FLUTTER_PACKAGE',
          category: 'UTILITIES',
          integrationConfigFlutter: {
            sourceType: SourceType.ARTIFACT,
            packageName: 'test_pkg',
          },
          homeWidget: { widgetClass: 'invalidLowercase' },
        })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('Widget class must be a Dart class name');
    });

    it('rejects FLUTTER_PACKAGE with empty widgetClass', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/miniapps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          appId: `com.test.hw.invalid2.${Date.now()}`,
          name: 'Empty Class MiniApp',
          integrationMethod: 'FLUTTER_PACKAGE',
          category: 'UTILITIES',
          integrationConfigFlutter: {
            sourceType: SourceType.ARTIFACT,
            packageName: 'test_pkg',
          },
          homeWidget: { widgetClass: '   ' },
        })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('is required for FLUTTER_PACKAGE apps');
    });

    it('rejects NATIVE_SDK with uppercase or special character viewId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/miniapps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          appId: `com.test.hw.invalid3.${Date.now()}`,
          name: 'Invalid Native MiniApp',
          integrationMethod: 'NATIVE_SDK',
          category: 'UTILITIES',
          integrationConfigNativeSdk: {
            iosModuleName: 'SpaBookingSDK',
            iosTypeName: 'SpaBookingSDKView',
            iosArtifactFilename: 'SpaBookingSDK.xcframework.zip',
            androidPackageName: 'com.example.spabooking',
            androidObjectName: 'SpaBookingSDK',
            androidArtifactFilename: 'spa-booking-sdk-1.0.0.aar',
            androidMavenGroupId: 'com.example.spa',
            androidMavenArtifactId: 'spa-booking-sdk',
            androidMavenVersion: '1.0.0',
          },
          homeWidget: { viewId: 'INVALID_CAPS_ID!' },
        })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('Widget view ID must use lowercase letters');
    });

    it('rejects WEBVIEW with non-https URL', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/miniapps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          appId: `com.test.hw.invalid4.${Date.now()}`,
          name: 'Insecure URL MiniApp',
          integrationMethod: 'WEBVIEW',
          category: 'UTILITIES',
          integrationConfigWebView: {
            productionUrl: 'https://secure-webview.example.com',
            allowedDomains: ['secure-webview.example.com'],
          },
          homeWidget: { url: 'http://insecure-widget.example.com' },
        })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('Widget URL must start with https://');
    });
  });

  describe('2. Successful Creation & Database Persistence', () => {
    let createdMiniApp: any;
    const targetAppId = `com.fsa.test.hw.e2e.${Date.now()}`;

    it('successfully registers FLUTTER_PACKAGE with valid HomeWidget and persists in DB', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/miniapps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          appId: targetAppId,
          name: 'E2E Verified Home Widget App',
          integrationMethod: 'FLUTTER_PACKAGE',
          category: 'UTILITIES',
          integrationConfigFlutter: {
            sourceType: SourceType.ARTIFACT,
            packageName: 'fsa_hw_pkg',
          },
          homeWidget: { widgetClass: 'E2EHomeWidget' },
        })
        .expect(201);

      createdMiniApp = res.body;
      createdAppIds.push(createdMiniApp.id);

      expect(createdMiniApp.homeWidget).toBeDefined();
      expect(createdMiniApp.homeWidget.widgetClass).toBe('E2EHomeWidget');

      // Verify direct PostgreSQL DB persistence
      const dbRecord = await miniAppRepo.findOne({ where: { id: createdMiniApp.id } });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.homeWidget).toEqual({ widgetClass: 'E2EHomeWidget' });
    });

    it('verifies Mobile Catalog delivers the Home Widget definition', async () => {
      // Mark the app as ACTIVE so it surfaces in mobile catalog
      await miniAppRepo.update({ id: createdMiniApp.id }, {
        lifecycleStatus: MiniAppStatus.ACTIVE,
      });

      const catalogRes = await request(app.getHttpServer())
        .get('/api/mobile/mini-apps')
        .expect(200);

      expect(catalogRes.body).toBeDefined();
      const items = Array.isArray(catalogRes.body.items) ? catalogRes.body.items : (Array.isArray(catalogRes.body) ? catalogRes.body : []);
      const targetItem = items.find((i: any) => i.appId === targetAppId);

      expect(targetItem).toBeDefined();
      expect(targetItem.widget).toEqual({ widgetClass: 'E2EHomeWidget' });
    });

    it('tracks Home Widget changes in Revision Diff workflow', async () => {
      // Submit a pending revision with an updated HomeWidget
      await miniAppRepo.update({ id: createdMiniApp.id }, {
        pendingRevision: {
          name: 'E2E Verified Home Widget App (Rev 2)',
          homeWidget: { widgetClass: 'UpdatedE2EHomeWidget' },
        } as any,
      });

      const diffRes = await request(app.getHttpServer())
        .get(`/api/miniapps/${createdMiniApp.id}/diff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(diffRes.body.differences).toBeDefined();
      expect(diffRes.body.differences.metadata.homeWidget).toMatchObject({
        base: 'E2EHomeWidget',
        target: 'UpdatedE2EHomeWidget',
        changed: true,
      });
    });
  });
});
