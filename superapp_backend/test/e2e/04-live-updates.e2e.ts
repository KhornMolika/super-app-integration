/**
 * Changing an app that is already live. The live version keeps serving the
 * phones while the next one is reviewed (and optionally tested); publishing
 * swaps them, rollback swaps back.
 */
import { bootApp, E2eApp } from './support/app';
import {
  action,
  appAt,
  appRow,
  buildResult,
  listed,
  opens,
  phoneUser,
  PhoneUser,
  scanResult,
  staff,
  Staff,
  stages,
} from './support/fixtures';

describe('Updating a live app', () => {
  let e: E2eApp;
  let dev: Staff;
  let sa: Staff;
  let phone: PhoneUser;

  beforeAll(async () => {
    e = await bootApp();
    dev = await staff(e, 'MA_DEVELOPER', 'FTC');
    sa = await staff(e, 'SUPER_ADMIN', 'FTC');
    phone = await phoneUser(e);
  });
  afterAll(() => e?.close());

  const edit = (id: string, body: Record<string, unknown>) =>
    e.http().patch(`/mini-apps/${id}`).set(dev.auth).send(body);

  describe('a new version, reviewed and published', () => {
    let id: string;
    beforeAll(async () => {
      id = await appAt(e, dev, sa, 'LIVE');
    });

    it('editing a live app starts version 1.1.0; 1.0.0 keeps serving the phones', async () => {
      const res = await edit(id, { version: '1.1.0', tagline: 'Version 1.1' });
      expect(res.status).toBe(200);
      expect(await stages(e, id)).toEqual(['1.1.0:IN_REVIEW', '1.0.0:ACTIVE']);
      const row = await appRow(e, id);
      expect(row.status).toBe('LIVE');
      expect(row.tagline).not.toBe('Version 1.1');
      expect(await listed(e, phone, id, 'release')).toBe(true);
      expect(await opens(e, phone, id, 'release')).toBe(200);
    });

    it('a submit is not needed (and refused) while the version is in review', async () => {
      expect((await action(e, dev, id, 'submit')).status).toBe(400);
    });

    it('approving the version publishes it: 1.1.0 ACTIVE, 1.0.0 PREVIOUS', async () => {
      await scanResult(e, id, 'PASSED');
      expect((await action(e, sa, id, 'approve')).status).toBe(201);
      expect(await stages(e, id)).toEqual(['1.1.0:ACTIVE', '1.0.0:PREVIOUS']);
      expect((await appRow(e, id)).status).toBe('LIVE');
      expect((await appRow(e, id)).tagline).toBe('Version 1.1');
    });

    it('rollback serves 1.0.0 again', async () => {
      const res = await action(e, sa, id, 'rollback', {
        targetVersion: '1.0.0',
      });
      expect(res.status).toBe(201);
      expect(await stages(e, id)).toEqual(['1.1.0:PREVIOUS', '1.0.0:ACTIVE']);
      expect((await appRow(e, id)).status).toBe('LIVE');
      expect(await listed(e, phone, id, 'release')).toBe(true);
    });

    it('rollback needs a target version that exists', async () => {
      expect((await action(e, sa, id, 'rollback', {})).status).toBe(400);
      expect(
        (await action(e, sa, id, 'rollback', { targetVersion: '9.9.9' }))
          .status,
      ).toBeGreaterThanOrEqual(400);
    });
  });

  it('discarding a new version keeps the live one', async () => {
    const id = await appAt(e, dev, sa, 'LIVE');
    await edit(id, { version: '1.1.0', tagline: 'Discard me' });
    expect((await action(e, dev, id, 'discard-revision')).status).toBe(201);
    expect(await stages(e, id)).toEqual(['1.0.0:ACTIVE']);
    expect((await appRow(e, id)).status).toBe('LIVE');
    expect((await action(e, dev, id, 'discard-revision')).status).toBe(400);
  });

  it('a new version can be tested before it is published, the app staying live', async () => {
    const id = await appAt(e, dev, sa, 'LIVE');
    await edit(id, { version: '1.1.0', tagline: 'Tested first' });
    await scanResult(e, id, 'PASSED');
    e.jenkins.reset();
    expect((await action(e, sa, id, 'start-testing')).status).toBe(201);
    expect(
      e.jenkins.callsOf('triggerSuperAppBuild')[0]?.options.miniAppSet,
    ).toBe('test');
    expect((await appRow(e, id)).status).toBe('LIVE');
    await buildResult(e, 'SUCCESS');
    expect((await appRow(e, id)).status).toBe('LIVE');
    expect(await stages(e, id)).toEqual(['1.1.0:TESTING', '1.0.0:ACTIVE']);
    expect(await listed(e, phone, id, 'release')).toBe(true);
  });
  it('start-testing on a live app with nothing new keeps it live', async () => {
    const id = await appAt(e, dev, sa, 'LIVE');
    const res = await action(e, sa, id, 'start-testing');
    expect((await appRow(e, id)).status).toBe('LIVE');
    expect(await listed(e, phone, id, 'release')).toBe(true);
    expect(res.status).toBe(400);
  });
  it('a developer cannot roll back the live version', async () => {
    const id = await appAt(e, dev, sa, 'LIVE');
    await edit(id, { version: '1.1.0', tagline: 'v1.1' });
    await scanResult(e, id, 'PASSED');
    await action(e, sa, id, 'approve');
    const res = await action(e, dev, id, 'rollback', {
      targetVersion: '1.0.0',
    });
    expect(res.status).toBe(403);
  });
});
