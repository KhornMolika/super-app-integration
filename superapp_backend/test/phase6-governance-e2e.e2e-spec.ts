import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Identity } from '../src/identities/entities/identity.entity';
import { StaffProfile } from '../src/staff/entities/staff-profile.entity';
import { Role } from '../src/access-control/entities/role.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { MiniApp } from '../src/miniapps/entities/miniapp.entity';
import { Repository } from 'typeorm';
import { hashPassword } from '../src/common/utils/password.util';

describe('Phase 6: Tasks 6.2, 6.3 & 6.4 Governance & Isolation Verification', () => {
  let app: INestApplication;
  let authService: AuthService;
  let identityRepo: Repository<Identity>;
  let staffProfileRepo: Repository<StaffProfile>;
  let roleRepo: Repository<Role>;
  let orgRepo: Repository<Organization>;
  let miniAppRepo: Repository<MiniApp>;

  let ftcOrg: Organization;
  let sercOrg: Organization;
  let devRole: Role;

  let leadDevToken: string;
  let leadDevUser: Identity;

  let teammateToken: string;
  let teammateUser: Identity;

  let foreignDevToken: string;
  let foreignDevUser: Identity;

  let superAdminToken: string;

  let testMiniAppId: string;
  const testAppId = `com.test.agencyapp.${Date.now()}`;

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
    identityRepo = app.get<Repository<Identity>>(getRepositoryToken(Identity));
    staffProfileRepo = app.get<Repository<StaffProfile>>(getRepositoryToken(StaffProfile));
    roleRepo = app.get<Repository<Role>>(getRepositoryToken(Role));
    orgRepo = app.get<Repository<Organization>>(getRepositoryToken(Organization));
    miniAppRepo = app.get<Repository<MiniApp>>(getRepositoryToken(MiniApp));

    // Resolve test organizations
    ftcOrg = (await orgRepo.findOne({ where: { code: 'FTC' } }))!;
    sercOrg = (await orgRepo.findOne({ where: { code: 'SERC' } }))!;
    devRole = (await roleRepo.findOne({ where: { name: 'MA_DEVELOPER' } }))!;
    if (!devRole) {
      devRole = (await roleRepo.findOne({ where: { name: 'ADMIN' } }))!;
    }

    const testDevPassword = 'TestGovDevPass_2026!';
    const defaultPwHash = await hashPassword(testDevPassword);
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD || '';

    // 1. Lead Developer under FTC
    leadDevUser = await identityRepo.save(
      identityRepo.create({
        email: `lead.dev.${Date.now()}@ftc.gov.kh`,
        name: 'FTC Lead Developer',
        passwordHash: defaultPwHash,
        status: 'ACTIVE',
      }),
    );
    await staffProfileRepo.save(
      staffProfileRepo.create({
        identityId: leadDevUser.id,
        roleId: devRole.id,
        organizationId: ftcOrg.id,
      }),
    );
    const leadLogin: any = await authService.login({
      email: leadDevUser.email,
      password: testDevPassword,
    });
    leadDevToken = leadLogin.access_token;

    // 2. Teammate Developer under same FTC organization
    teammateUser = await identityRepo.save(
      identityRepo.create({
        email: `teammate.${Date.now()}@ftc.gov.kh`,
        name: 'FTC Teammate Developer',
        passwordHash: defaultPwHash,
        status: 'ACTIVE',
      }),
    );
    await staffProfileRepo.save(
      staffProfileRepo.create({
        identityId: teammateUser.id,
        roleId: devRole.id,
        organizationId: ftcOrg.id,
      }),
    );
    const teammateLogin: any = await authService.login({
      email: teammateUser.email,
      password: testDevPassword,
    });
    teammateToken = teammateLogin.access_token;

    // 3. Foreign Developer under SERC organization (different agency)
    foreignDevUser = await identityRepo.save(
      identityRepo.create({
        email: `serc.dev.${Date.now()}@serc.gov.kh`,
        name: 'SERC Agency Developer',
        passwordHash: defaultPwHash,
        status: 'ACTIVE',
      }),
    );
    await staffProfileRepo.save(
      staffProfileRepo.create({
        identityId: foreignDevUser.id,
        roleId: devRole.id,
        organizationId: sercOrg.id,
      }),
    );
    const foreignLogin: any = await authService.login({
      email: foreignDevUser.email,
      password: testDevPassword,
    });
    foreignDevToken = foreignLogin.access_token;

    // 4. Super Admin
    const superAdminLogin: any = await authService.login({
      email: 'molikakhorn71@gmail.com',
      password: superAdminPassword,
    });
    superAdminToken = superAdminLogin.access_token;
  }, 60000);

  afterAll(async () => {
    // Clean up created resources
    if (testMiniAppId) {
      await miniAppRepo.delete({ id: testMiniAppId }).catch(() => undefined);
    }
    if (leadDevUser) {
      await staffProfileRepo.delete({ identityId: leadDevUser.id }).catch(() => undefined);
      await identityRepo.delete({ id: leadDevUser.id }).catch(() => undefined);
    }
    if (teammateUser) {
      await staffProfileRepo.delete({ identityId: teammateUser.id }).catch(() => undefined);
      await identityRepo.delete({ id: teammateUser.id }).catch(() => undefined);
    }
    if (foreignDevUser) {
      await staffProfileRepo.delete({ identityId: foreignDevUser.id }).catch(() => undefined);
      await identityRepo.delete({ id: foreignDevUser.id }).catch(() => undefined);
    }
    if (app) await app.close();
  });

  describe('Task 6.2: MiniApp Creation & Automatic Agency Inheritance', () => {
    it('automatically sets organizationId to creator user agency and rejects cross-agency spoofing', async () => {
      // Cross-agency creation attempt should be blocked
      await request(app.getHttpServer())
        .post('/mini-apps/draft')
        .set('Authorization', `Bearer ${leadDevToken}`)
        .send({
          appId: `${testAppId}.invalid`,
          name: 'Spoofed MiniApp',
          organizationId: sercOrg.id, // Developer is FTC, attempting to spoof SERC
          integrationMethod: 'WEBVIEW',
          integrationConfig: { productionUrl: 'https://test.ftc.gov.kh' },
        })
        .expect(403);

      // Legitimate creation automatically inherits FTC agency
      const createRes = await request(app.getHttpServer())
        .post('/mini-apps/draft')
        .set('Authorization', `Bearer ${leadDevToken}`)
        .send({
          appId: testAppId,
          name: 'FTC Official Portal',
          integrationMethod: 'WEBVIEW',
          integrationConfig: { productionUrl: 'https://test.ftc.gov.kh' },
        })
        .expect(201);

      expect(createRes.body).toHaveProperty('id');
      testMiniAppId = createRes.body.id;

      // Verify in DB directly: agency & ownership inheritance
      const savedApp = await miniAppRepo.findOne({ where: { id: testMiniAppId } });
      expect(savedApp).toBeDefined();
      expect(savedApp!.organizationId).toBe(ftcOrg.id);
      expect(savedApp!.ownerId).toBe(leadDevUser.id);
      expect(savedApp!.organizationCode).toBe('FTC');
    });
  });

  describe('Task 6.3: Option C Hybrid Agency Collaboration & Governance', () => {
    it('allows agency teammate to view and update draft MiniApp', async () => {
      // Teammate views MiniApp
      const viewRes = await request(app.getHttpServer())
        .get(`/mini-apps/${testMiniAppId}`)
        .set('Authorization', `Bearer ${teammateToken}`)
        .expect(200);

      expect(viewRes.body.id).toBe(testMiniAppId);

      // Teammate updates draft metadata
      const updateRes = await request(app.getHttpServer())
        .patch(`/mini-apps/${testMiniAppId}`)
        .set('Authorization', `Bearer ${teammateToken}`)
        .send({
          shortDescription: 'Updated draft description by FTC teammate',
        })
        .expect(200);

      expect(updateRes.body.shortDescription).toBe('Updated draft description by FTC teammate');
    });

    it('blocks agency teammate from submitting release for review (lead-only gate)', async () => {
      // Teammate attempts submission -> Must be 403 Forbidden
      const submitRes = await request(app.getHttpServer())
        .post(`/mini-apps/${testMiniAppId}/submit`)
        .set('Authorization', `Bearer ${teammateToken}`)
        .expect(403);

      expect(submitRes.body.message).toContain('Only the Lead Developer');
    });

    it('allows lead maintainer to submit release for review', async () => {
      // Lead developer performs submission
      const submitRes = await request(app.getHttpServer())
        .post(`/mini-apps/${testMiniAppId}/submit`)
        .set('Authorization', `Bearer ${leadDevToken}`)
        .expect(201);

      expect(submitRes.body).toBeDefined();
    });
  });

  describe('Task 6.4: Cross-Agency Strict Firewall Isolation', () => {
    it('strictly forbids a foreign agency developer from accessing or editing FTC MiniApp', async () => {
      // SERC developer tries to view FTC MiniApp
      await request(app.getHttpServer())
        .get(`/mini-apps/${testMiniAppId}`)
        .set('Authorization', `Bearer ${foreignDevToken}`)
        .expect(403);

      // SERC developer tries to update FTC MiniApp
      await request(app.getHttpServer())
        .patch(`/mini-apps/${testMiniAppId}`)
        .set('Authorization', `Bearer ${foreignDevToken}`)
        .send({ name: 'Tampered Name' })
        .expect(403);

      // SERC developer queries all MiniApps -> FTC MiniApp is absent
      const listRes = await request(app.getHttpServer())
        .get('/mini-apps')
        .set('Authorization', `Bearer ${foreignDevToken}`)
        .expect(200);

      const containsFtcApp = listRes.body.some((app: any) => app.id === testMiniAppId);
      expect(containsFtcApp).toBe(false);
    });

    it('allows SuperAdmin to view MiniApps across all agencies without restriction', async () => {
      const superAdminRes = await request(app.getHttpServer())
        .get(`/mini-apps/${testMiniAppId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(superAdminRes.body.id).toBe(testMiniAppId);
    });
  });
});
