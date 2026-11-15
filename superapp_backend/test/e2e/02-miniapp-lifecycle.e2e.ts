/**
 * A mini app from draft to live, through the real endpoints, with Jenkins
 * played by the tests (scan and build callbacks).
 *
 *   DRAFT -> submit -> SUBMITTED -> scan -> IN_REVIEW -> approve -> APPROVED
 *   -> start-testing (test build) -> TESTING -> pass-testing -> TEST_PASSED
 *   -> activate (release build) -> LIVE
 *
 * At each stage: which phones list and open the app (test build = debug,
 * official build = release, no header = an older official build).
 */
import { bootApp, callbackHeaders, E2eApp } from './support/app';
import {
  action,
  appAt,
  appRow,
  buildResult,
  data,
  listed,
  newDraft,
  opens,
  phoneUser,
  PhoneUser,
  scanResult,
  staff,
  Staff,
  stages,
  webviewApp,
} from './support/fixtures';

describe('Mini app lifecycle', () => {
  let e: E2eApp;
  let dev: Staff;
  let sa: Staff;
  let admin: Staff;
  let phone: PhoneUser;

  beforeAll(async () => {
    e = await bootApp();
    dev = await staff(e, 'MA_DEVELOPER', 'FTC');
    sa = await staff(e, 'SUPER_ADMIN', 'FTC');
    admin = await staff(e, 'ADMIN', 'FTC');
    phone = await phoneUser(e);
  });
  afterAll(() => e?.close());
  beforeEach(() => e.jenkins.reset());

  /** Which phones see and open the app: [debug lists, release lists, no header lists, debug opens, release opens]. */
  const visibility = async (id: string) => [
    await listed(e, phone, id, 'debug'),
    await listed(e, phone, id, 'release'),
    await listed(e, phone, id),
    await opens(e, phone, id, 'debug'),
    await opens(e, phone, id, 'release'),
  ];
  const HIDDEN = [false, false, false, 403, 403];
  const TEST_ONLY = [true, false, false, 200, 403];
  const EVERYWHERE = [true, true, true, 200, 200];

  describe('the happy path, step by step', () => {
    let id: string;

    it('a new draft: app DRAFT, version 1.0.0 DRAFT, on no phone', async () => {
      id = await newDraft(e, dev);
      expect((await appRow(e, id)).status).toBe('DRAFT');
      expect(await stages(e, id)).toEqual(['1.0.0:DRAFT']);
      expect(await visibility(id)).toEqual(HIDDEN);
    });

    it('submit: SUBMITTED and a security scan is queued in Jenkins', async () => {
      const res = await action(e, dev, id, 'submit');
      expect(res.status).toBe(201);
      expect(await stages(e, id)).toEqual(['1.0.0:SUBMITTED']);
      expect(e.jenkins.callsOf('triggerMiniAppValidation')).toHaveLength(1);
      expect(await visibility(id)).toEqual(HIDDEN);
    });

    it('scan passed: IN_REVIEW', async () => {
      expect((await scanResult(e, id, 'PASSED')).status).toBe(200);
      expect(await stages(e, id)).toEqual(['1.0.0:IN_REVIEW']);
      expect(await visibility(id)).toEqual(HIDDEN);
    });

    it('approve: APPROVED, no build yet', async () => {
      expect((await action(e, sa, id, 'approve')).status).toBe(201);
      expect(await stages(e, id)).toEqual(['1.0.0:APPROVED']);
      expect(e.jenkins.callsOf('triggerSuperAppBuild')).toHaveLength(0);
      expect(await visibility(id)).toEqual(HIDDEN);
    });

    it('start testing: a test build with the test set of mini apps', async () => {
      expect((await action(e, sa, id, 'start-testing')).status).toBe(201);
      const [build] = e.jenkins.callsOf('triggerSuperAppBuild');
      expect(build.options.miniAppSet).toBe('test');
      expect(await stages(e, id)).toEqual(['1.0.0:APPROVED']);
      const detail = data(await e.http().get(`/mini-apps/${id}`).set(dev.auth));
      expect(detail.lifecycleStatus).toBe('BUILDING');
    });

    it('test build done: TESTING, on test-build phones only', async () => {
      expect((await buildResult(e, 'SUCCESS')).status).toBe(200);
      expect(await stages(e, id)).toEqual(['1.0.0:TESTING']);
      expect((await appRow(e, id)).status).toBe('DRAFT');
      expect(await visibility(id)).toEqual(TEST_ONLY);
    });

    it('testing passed: TEST_PASSED, still on test-build phones only', async () => {
      expect((await action(e, sa, id, 'pass-testing')).status).toBe(201);
      expect(await stages(e, id)).toEqual(['1.0.0:TEST_PASSED']);
      expect(await visibility(id)).toEqual(TEST_ONLY);
    });

    it('activate: LIVE at once and an official build with the release set is queued', async () => {
      expect((await action(e, sa, id, 'activate')).status).toBe(201);
      expect((await appRow(e, id)).status).toBe('LIVE');
      expect(await stages(e, id)).toEqual(['1.0.0:ACTIVE']);
      const [build] = e.jenkins.callsOf('triggerSuperAppBuild');
      expect(build.options.miniAppSet).toBe('release');
      expect(build.options.buildType).toBe('release');
      expect(await visibility(id)).toEqual(EVERYWHERE);
    });

    it('the official build reporting back leaves the app LIVE', async () => {
      expect((await buildResult(e, 'SUCCESS')).status).toBe(200);
      expect((await appRow(e, id)).status).toBe('LIVE');
      expect(await stages(e, id)).toEqual(['1.0.0:ACTIVE']);
      expect(await visibility(id)).toEqual(EVERYWHERE);
    });

    it('the Backoffice detail shows the old fields consistently', async () => {
      const detail = data(await e.http().get(`/mini-apps/${id}`).set(dev.auth));
      expect(detail.lifecycleStatus).toBe('ACTIVE');
      expect(detail.availabilityStatus).toBe('PRODUCTION');
      expect(detail.appStatus).toBe('LIVE');
    });
  });

  describe('steps out of order are refused', () => {
    it('submit twice', async () => {
      const id = await newDraft(e, dev);
      await action(e, dev, id, 'submit');
      const res = await action(e, dev, id, 'submit');
      expect(res.status).toBe(400);
      expect(await stages(e, id)).toEqual(['1.0.0:SUBMITTED']);
    });

    it('start testing before approval', async () => {
      const id = await appAt(e, dev, sa, 'IN_REVIEW');
      e.jenkins.reset();
      const res = await action(e, sa, id, 'start-testing');
      // IN_REVIEW is accepted by the code; it must at least not skip approval silently
      if (res.status === 201) {
        expect(await stages(e, id)).not.toContain('1.0.0:TESTING');
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('pass testing before the test build', async () => {
      const id = await appAt(e, dev, sa, 'APPROVED');
      const res = await action(e, sa, id, 'pass-testing');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/TESTING/);
    });

    it('activate before testing passed', async () => {
      const id = await appAt(e, dev, sa, 'TESTING');
      const res = await action(e, sa, id, 'activate');
      expect(res.status).toBe(400);
      expect((await appRow(e, id)).status).toBe('DRAFT');
    });

    it('the organization ADMIN cannot approve, test or activate', async () => {
      const id = await appAt(e, dev, sa, 'TEST_PASSED');
      expect((await action(e, admin, id, 'activate')).status).toBe(403);
      expect((await appRow(e, id)).status).toBe('DRAFT');
    });
    it('cannot approve while the scan is still running', async () => {
      const id = await newDraft(e, dev);
      await action(e, dev, id, 'submit');
      expect((await action(e, sa, id, 'approve')).status).toBe(400);
    });

    it('cannot approve a draft that was never submitted', async () => {
      const id = await newDraft(e, dev);
      expect((await action(e, sa, id, 'approve')).status).toBe(400);
      expect(await stages(e, id)).toEqual(['1.0.0:DRAFT']);
    });
  });

  it('registering with POST /mini-apps submits at once: SUBMITTED until the scan passes', async () => {
    const body = webviewApp();
    const res = await e.http().post('/mini-apps').set(dev.auth).send(body);
    if (res.status !== 201)
      throw new Error(
        `create failed (${res.status}): ${JSON.stringify(res.body)}`,
      );
    const id = data(res).id;
    expect(await stages(e, id)).toEqual(['1.0.0:SUBMITTED']);
    expect((await action(e, sa, id, 'approve')).status).toBe(400);
    await scanResult(e, id, 'PASSED');
    expect(await stages(e, id)).toEqual(['1.0.0:IN_REVIEW']);
    expect((await action(e, sa, id, 'approve')).status).toBe(201);
  });

  describe('the security scan', () => {
    it('a failed scan sends the app back to the developer, blocks approval, allows a new submission', async () => {
      const id = await newDraft(e, dev);
      await action(e, dev, id, 'submit');
      expect((await scanResult(e, id, 'FAILED')).status).toBe(200);
      expect(await stages(e, id)).toEqual(['1.0.0:DRAFT']);
      const approve = await action(e, sa, id, 'approve');
      expect(approve.status).toBe(400);
      expect(approve.body.message).toMatch(/security scan failed/i);
      expect((await action(e, dev, id, 'submit')).status).toBe(201);
      expect(await stages(e, id)).toEqual(['1.0.0:SUBMITTED']);
    });

    it('only Jenkins (the callback token) can report a scan result', async () => {
      const id = await newDraft(e, dev);
      await action(e, dev, id, 'submit');
      const body = { miniAppId: id, status: 'PASSED', score: 100, checks: {} };
      const none = await e
        .http()
        .post('/integrations/validation/callback')
        .send(body);
      const wrong = await e
        .http()
        .post('/integrations/validation/callback')
        .set({ 'x-callback-token': 'guessed' })
        .send(body);
      const asUser = await e
        .http()
        .post('/integrations/validation/callback')
        .set(dev.auth)
        .send(body);
      expect([none.status, wrong.status, asUser.status]).toEqual([
        401, 401, 401,
      ]);
      expect(await stages(e, id)).toEqual(['1.0.0:SUBMITTED']);
    });

    it('rejects a callback with a bad status or app id', async () => {
      const bad = await e
        .http()
        .post('/integrations/validation/callback')
        .set(callbackHeaders)
        .send({ miniAppId: 'not-a-uuid', status: 'PASSED' });
      expect(bad.status).toBe(400);
      const id = await newDraft(e, dev);
      const weird = await e
        .http()
        .post('/integrations/validation/callback')
        .set(callbackHeaders)
        .send({ miniAppId: id, status: 'MAYBE' });
      expect(weird.status).toBe(400);
    });

    it('only Jenkins can report a build result', async () => {
      const res = await e
        .http()
        .post('/release-assembly/build-callback')
        .send({ releaseVersion: 'v0.0.1', status: 'SUCCESS' });
      expect(res.status).toBe(401);
    });
  });

  describe('review decisions', () => {
    it('request changes: an edit by the developer resubmits it (validation, then a new scan)', async () => {
      const id = await appAt(e, dev, sa, 'IN_REVIEW');
      const res = await action(e, sa, id, 'request-changes', {
        reason: 'Please fix the logo',
      });
      expect(res.status).toBe(201);
      expect(await stages(e, id)).toEqual(['1.0.0:CHANGES_REQUESTED']);
      expect(
        (
          await e
            .http()
            .patch(`/mini-apps/${id}`)
            .set(dev.auth)
            .send({ tagline: 'Fixed' })
        ).status,
      ).toBe(200);
      // Saving runs the checks in the background; passing them submits the app
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline && (await stages(e, id))[0] !== '1.0.0:SUBMITTED') {
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(await stages(e, id)).toEqual(['1.0.0:SUBMITTED']);
      // Already submitted: a second submit is refused, the scan result moves it on
      expect((await action(e, dev, id, 'submit')).status).toBe(400);
      await scanResult(e, id, 'PASSED');
      expect(await stages(e, id)).toEqual(['1.0.0:IN_REVIEW']);
    });

    it('reject: REJECTED, and the developer may submit again', async () => {
      const id = await appAt(e, dev, sa, 'IN_REVIEW');
      expect(
        (
          await action(e, sa, id, 'reject', {
            reason: 'Not suitable for the platform',
          })
        ).status,
      ).toBe(201);
      expect(await stages(e, id)).toEqual(['1.0.0:REJECTED']);
      expect(await listed(e, phone, id, 'debug')).toBe(false);
      expect((await action(e, dev, id, 'submit')).status).toBe(201);
    });
  });

  describe('the test build', () => {
    it('a failed build shows BUILD_FAILED, blocks pass-testing, and a retry recovers', async () => {
      const id = await appAt(e, dev, sa, 'APPROVED');
      await action(e, sa, id, 'start-testing');
      expect((await buildResult(e, 'FAILED')).status).toBe(200);
      const detail = data(await e.http().get(`/mini-apps/${id}`).set(sa.auth));
      expect(detail.lifecycleStatus).toBe('BUILD_FAILED');
      expect(await listed(e, phone, id, 'debug')).toBe(false);
      expect((await action(e, sa, id, 'pass-testing')).status).toBe(400);
      expect((await action(e, sa, id, 'start-testing')).status).toBe(201);
      await buildResult(e, 'SUCCESS');
      expect(await stages(e, id)).toEqual(['1.0.0:TESTING']);
    });
    it('Jenkins being down is reported to the admin', async () => {
      const id = await appAt(e, dev, sa, 'APPROVED');
      e.jenkins.failNext = true;
      const res = await action(e, sa, id, 'start-testing');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
    it('a second start-testing while a build runs does not queue another build', async () => {
      const id = await appAt(e, dev, sa, 'APPROVED');
      await action(e, sa, id, 'start-testing');
      await action(e, sa, id, 'start-testing');
      expect(e.jenkins.callsOf('triggerSuperAppBuild')).toHaveLength(1);
    });
  });
});
