/**
 * Backoffice sign-in, roles and organization isolation.
 *
 *   Who can do what: STAFF reads, MA_DEVELOPER builds apps in its own
 *   organization, ADMIN supervises its organization, only SUPER_ADMIN decides
 *   reviews. Nobody reaches another organization's apps.
 */
import { bootApp, E2eApp } from './support/app';
import {
  appRow,
  createStaffUser,
  data,
  orgId,
  PASSWORD,
  staff,
  Staff,
  webviewApp,
} from './support/fixtures';

describe('Backoffice sign-in, roles and organizations', () => {
  let e: E2eApp;
  let dev: Staff;
  let teammate: Staff;
  let foreignDev: Staff;
  let orgAdmin: Staff;
  let superAdmin: Staff;
  let appId: string;

  beforeAll(async () => {
    e = await bootApp();
    dev = await staff(e, 'MA_DEVELOPER', 'FTC');
    teammate = await staff(e, 'MA_DEVELOPER', 'FTC');
    foreignDev = await staff(e, 'MA_DEVELOPER', 'SERC');
    orgAdmin = await staff(e, 'ADMIN', 'FTC');
    superAdmin = await staff(e, 'SUPER_ADMIN', 'FTC');
  });
  afterAll(() => e?.close());

  describe('sign-in', () => {
    it('gives tokens for the right password', async () => {
      const res = await e
        .http()
        .post('/auth/login')
        .send({ email: dev.email, password: PASSWORD });
      expect(res.status).toBe(200);
      expect(data(res).access_token).toEqual(expect.any(String));
      expect(data(res).refresh_token).toEqual(expect.any(String));
    });

    it('refuses a wrong password and an unknown email', async () => {
      const wrong = await e
        .http()
        .post('/auth/login')
        .send({ email: dev.email, password: 'Nope-Wrong-123!' });
      const unknown = await e
        .http()
        .post('/auth/login')
        .send({ email: 'nobody@e2e.local', password: PASSWORD });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
    });
    it('gives the same message for both (no account enumeration)', async () => {
      const wrong = await e
        .http()
        .post('/auth/login')
        .send({ email: dev.email, password: 'Nope-Wrong-123!' });
      const unknown = await e
        .http()
        .post('/auth/login')
        .send({ email: 'nobody@e2e.local', password: PASSWORD });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.message).toBe(unknown.body.message);
    });

    it('refuses requests without a token or with a forged one', async () => {
      expect((await e.http().get('/mini-apps')).status).toBe(401);
      expect(
        (
          await e
            .http()
            .get('/mini-apps')
            .set({ Authorization: 'Bearer not.a.jwt' })
        ).status,
      ).toBe(401);
    });

    const refresh = (token: string) =>
      e.http().post('/auth/refresh').send({ refresh_token: token });
    const refreshed = (res: { body: any }) => Boolean(data(res)?.access_token);

    it('refreshes a session', async () => {
      const login = data(
        await e
          .http()
          .post('/auth/login')
          .send({ email: teammate.email, password: PASSWORD }),
      );
      const res = await refresh(login.refresh_token);
      expect([200, 201]).toContain(res.status);
      expect(refreshed(res)).toBe(true);
    });

    it('refuses a garbage refresh token', async () => {
      const res = await refresh('garbage-token');
      expect(refreshed(res)).toBe(false);
    });
    it('a refresh token works once: a quick second use (another tab) continues the session, a later replay ends it', async () => {
      const login = data(
        await e
          .http()
          .post('/auth/login')
          .send({ email: teammate.email, password: PASSWORD }),
      );
      const first = await refresh(login.refresh_token);
      expect(refreshed(first)).toBe(true);
      // Two tabs refreshing together: the second gets tokens too
      expect(refreshed(await refresh(login.refresh_token))).toBe(true);
      // Presented again later: a leaked copy. Refused, and the whole session ends
      await e.db.query(
        `UPDATE refresh_tokens SET "rotatedAt" = now() - interval '5 minutes' WHERE "rotatedAt" IS NOT NULL AND "identityId" = $1`,
        [teammate.id],
      );
      expect(refreshed(await refresh(login.refresh_token))).toBe(false);
      expect(refreshed(await refresh(data(first).refresh_token))).toBe(false);
    });
  });

  describe('creating apps', () => {
    it('a STAFF user cannot sign in to the Backoffice (the phone app only)', async () => {
      const user = await createStaffUser(e, 'STAFF', 'FTC');
      const res = await e
        .http()
        .post('/auth/login')
        .send({ email: user.email, password: PASSWORD });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/cannot use the Backoffice/);
    });

    it('a developer creates a draft in their own organization', async () => {
      const res = await e
        .http()
        .post('/mini-apps/draft')
        .set(dev.auth)
        .send(webviewApp());
      expect(res.status).toBe(201);
      appId = data(res).id;
      const row = await appRow(e, appId);
      expect(row.organizationId).toBe(dev.orgId);
      expect(row.ownerId).toBe(dev.id);
      expect(row.status).toBe('DRAFT');
    });

    it('a developer cannot create an app for another organization', async () => {
      const serc = await orgId(e.db, 'SERC');
      const res = await e
        .http()
        .post('/mini-apps/draft')
        .set(dev.auth)
        .send(webviewApp({ organizationId: serc }));
      expect(res.status).toBe(403);
    });
    it('cannot skip review by sending a status in the create body', async () => {
      const res = await e
        .http()
        .post('/mini-apps/draft')
        .set(dev.auth)
        .send(
          webviewApp({
            lifecycleStatus: 'ACTIVE',
            availabilityStatus: 'PRODUCTION',
          }),
        );
      expect(res.status).toBe(201);
      expect((await appRow(e, data(res).id)).status).toBe('DRAFT');
    });

    it('cannot skip review by patching a status', async () => {
      const own = data(
        await e
          .http()
          .post('/mini-apps/draft')
          .set(dev.auth)
          .send(webviewApp()),
      ).id;
      const res = await e.http().patch(`/mini-apps/${own}`).set(dev.auth).send({
        lifecycleStatus: 'ACTIVE',
        availabilityStatus: 'PRODUCTION',
      });
      expect([200, 400]).toContain(res.status);
      expect((await appRow(e, own)).status).toBe('DRAFT');
    });

    it('rejects a duplicate appId', async () => {
      const body = webviewApp();
      expect(
        (await e.http().post('/mini-apps/draft').set(dev.auth).send(body))
          .status,
      ).toBe(201);
      const again = await e
        .http()
        .post('/mini-apps/draft')
        .set(dev.auth)
        .send(body);
      expect([400, 409]).toContain(again.status);
    });

    it('rejects a body without appId or name', async () => {
      const res = await e
        .http()
        .post('/mini-apps/draft')
        .set(dev.auth)
        .send({ integrationMethod: 'WEBVIEW' });
      expect(res.status).toBe(400);
    });
  });

  describe('organization isolation', () => {
    it('a teammate in the same organization sees the app only once added as a collaborator', async () => {
      expect(
        (await e.http().get(`/mini-apps/${appId}`).set(teammate.auth)).status,
      ).toBe(404);
      const add = await e
        .http()
        .post(`/mini-apps/${appId}/collaborators`)
        .set(dev.auth)
        .send({ userId: teammate.id, role: 'DEVELOPER' });
      expect([200, 201]).toContain(add.status);
      expect(
        (await e.http().get(`/mini-apps/${appId}`).set(teammate.auth)).status,
      ).toBe(200);
    });

    it('a developer of another organization cannot be added as a collaborator', async () => {
      const res = await e
        .http()
        .post(`/mini-apps/${appId}/collaborators`)
        .set(dev.auth)
        .send({ userId: foreignDev.id, role: 'DEVELOPER' });
      expect([400, 403]).toContain(res.status);
    });

    it('a collaborator DEVELOPER cannot add other collaborators (MAINTAINER or owner only)', async () => {
      const other = await staff(e, 'MA_DEVELOPER', 'FTC');
      const res = await e
        .http()
        .post(`/mini-apps/${appId}/collaborators`)
        .set(teammate.auth)
        .send({ userId: other.id, role: 'VIEWER' });
      expect(res.status).toBe(403);
    });

    it('a developer of another organization can neither see nor change it', async () => {
      const view = await e
        .http()
        .get(`/mini-apps/${appId}`)
        .set(foreignDev.auth);
      expect([403, 404]).toContain(view.status);
      const edit = await e
        .http()
        .patch(`/mini-apps/${appId}`)
        .set(foreignDev.auth)
        .send({ name: 'Hijacked' });
      expect([403, 404]).toContain(edit.status);
      const submit = await e
        .http()
        .post(`/mini-apps/${appId}/submit`)
        .set(foreignDev.auth);
      expect([403, 404]).toContain(submit.status);
      expect((await appRow(e, appId)).name).not.toBe('Hijacked');
    });

    it('the list shows a developer only their organization', async () => {
      const res = await e
        .http()
        .get('/mini-apps?limit=100')
        .set(foreignDev.auth);
      expect(res.status).toBe(200);
      const items: any[] = data(res).items ?? data(res);
      expect(items.find((a) => a.id === appId)).toBeUndefined();
    });

    it('the organization ADMIN and the SUPER_ADMIN see it', async () => {
      expect(
        (await e.http().get(`/mini-apps/${appId}`).set(orgAdmin.auth)).status,
      ).toBe(200);
      expect(
        (await e.http().get(`/mini-apps/${appId}`).set(superAdmin.auth)).status,
      ).toBe(200);
    });
  });

  describe('review decisions are SUPER_ADMIN only', () => {
    it.each([['approve'], ['reject'], ['request-changes'], ['activate']])(
      'a developer and an ADMIN cannot %s',
      async (action) => {
        for (const who of [dev, orgAdmin]) {
          const res = await e
            .http()
            .post(`/mini-apps/${appId}/${action}`)
            .set(who.auth)
            .send({ reason: 'e2e' });
          expect(res.status).toBe(403);
        }
      },
    );

    it('a developer cannot suspend or archive', async () => {
      for (const action of ['suspend', 'archive', 'request-archive']) {
        const res = await e
          .http()
          .post(`/mini-apps/${appId}/${action}`)
          .set(dev.auth)
          .send({ reason: 'e2e' });
        expect(res.status).toBe(403);
      }
    });
  });
});
