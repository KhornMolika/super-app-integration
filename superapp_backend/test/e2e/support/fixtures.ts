/**
 * People and apps for the flows. Users are created straight in the database
 * (as an admin would), then sign in over HTTP like the Backoffice and the
 * phone do. Emails use @e2e.local: the seeder purges @example.com/@test.com
 * accounts on every boot.
 */
import { DataSource } from 'typeorm';
import { hashPassword } from '../../../src/common/utils/password.util';
import { E2eApp, callbackHeaders } from './app';

export const PASSWORD = 'E2e-Strong-Passw0rd!';
let seq = 0;
export const uniq = (p: string) =>
  `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

export type RoleName = 'SUPER_ADMIN' | 'ADMIN' | 'MA_DEVELOPER' | 'STAFF';

export interface Staff {
  id: string;
  email: string;
  token: string;
  orgId: string;
  auth: { Authorization: string };
}

async function one(
  db: DataSource,
  sql: string,
  params: unknown[],
): Promise<any> {
  const rows = await db.query(sql, params);
  if (!rows[0])
    throw new Error(`fixture: no row for ${sql} ${JSON.stringify(params)}`);
  return rows[0];
}

export async function orgId(db: DataSource, code: string): Promise<string> {
  return (await one(db, `SELECT id FROM organizations WHERE code = $1`, [code]))
    .id;
}

/** A user with this role in this organization (not signed in). */
export async function createStaffUser(e: E2eApp, role: RoleName, org = 'FTC') {
  const email = `${uniq(role.toLowerCase())}@e2e.local`;
  const roleRow = await one(e.db, `SELECT id FROM roles WHERE name = $1`, [
    role,
  ]);
  const org_id = await orgId(e.db, org);
  const [identity] = await e.db.query(
    `INSERT INTO identities (email, name, "passwordHash", status, "emailVerifiedAt", "failedLoginCount")
     VALUES ($1, $2, $3, 'ACTIVE', now(), 0) RETURNING id`,
    [email, `E2E ${role}`, await hashPassword(PASSWORD)],
  );
  await e.db.query(
    `INSERT INTO staff_profiles ("identityId", "roleId", "organizationId") VALUES ($1, $2, $3)`,
    [identity.id, roleRow.id, org_id],
  );
  return { id: identity.id as string, email, orgId: org_id };
}

/** A Backoffice user with this role in this organization, signed in. */
export async function staff(
  e: E2eApp,
  role: RoleName,
  org = 'FTC',
): Promise<Staff> {
  const { id, email, orgId: org_id } = await createStaffUser(e, role, org);
  const res = await e
    .http()
    .post('/auth/login')
    .send({ email, password: PASSWORD });
  const token = res.body?.data?.access_token ?? res.body?.access_token;
  if (!token)
    throw new Error(
      `staff login failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  return {
    id,
    email,
    token,
    orgId: org_id,
    auth: { Authorization: `Bearer ${token}` },
  };
}

export interface PhoneUser {
  id: string;
  email: string;
  token: string;
  auth: (build?: 'debug' | 'release') => Record<string, string>;
}

/** A Super App user (verified), signed in through the mobile API. */
export async function phoneUser(e: E2eApp): Promise<PhoneUser> {
  const email = `${uniq('phone')}@e2e.local`;
  const [identity] = await e.db.query(
    `INSERT INTO identities (email, name, "passwordHash", status, "emailVerifiedAt", "failedLoginCount")
     VALUES ($1, 'E2E Phone User', $2, 'ACTIVE', now(), 0) RETURNING id`,
    [email, await hashPassword(PASSWORD)],
  );
  await e.db.query(`INSERT INTO consumer_profiles ("identityId") VALUES ($1)`, [
    identity.id,
  ]);
  const res = await e
    .http()
    .post('/mobile/auth/login')
    .send({ email, password: PASSWORD });
  const token = res.body?.data?.access_token ?? res.body?.access_token;
  if (!token)
    throw new Error(
      `phone login failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  return {
    id: identity.id,
    email,
    token,
    auth: (build) => ({
      Authorization: `Bearer ${token}`,
      ...(build ? { 'X-Super-App-Build': build } : {}),
    }),
  };
}

/** The response payload, with or without the { success, data } envelope. */
export const data = (res: { body: any }) =>
  res.body && typeof res.body === 'object' && 'data' in res.body
    ? res.body.data
    : res.body;

/** A WebView app's create body. */
export function webviewApp(overrides: Record<string, unknown> = {}) {
  const appId = `kh.e2e.${uniq('app')}`;
  return {
    appId,
    name: `E2E ${appId.split('.').pop()}`,
    tagline: 'End-to-end test app',
    description: 'Created by the e2e flows',
    category: 'FINANCE',
    supportEmail: 'support@e2e.local',
    ownerEmail: 'owner@e2e.local',
    integrationMethod: 'WEBVIEW',
    // The shape the Backoffice register form sends. example.com: outside
    // production the reachability check accepts it without a network call
    integrationConfigWebView: {
      productionUrl: 'https://example.com/e2e',
      allowedDomains: ['example.com'],
    },
    ...overrides,
  };
}

/** Jenkins reports a scan result for the app. */
export async function scanResult(
  e: E2eApp,
  miniAppId: string,
  status: 'PASSED' | 'FAILED',
) {
  return e
    .http()
    .post('/integrations/validation/callback')
    .set(callbackHeaders)
    .send({
      miniAppId,
      status,
      score: status === 'PASSED' ? 95 : 20,
      method: 'WEBVIEW',
      checks: {},
      findings:
        status === 'FAILED' ? [{ severity: 'HIGH', title: 'E2E finding' }] : [],
    });
}

export async function appRow(e: E2eApp, id: string) {
  return one(e.db, `SELECT * FROM mini_apps WHERE id = $1`, [id]);
}

export async function versionRows(e: E2eApp, id: string): Promise<any[]> {
  return e.db.query(
    `SELECT version, status FROM mini_app_versions WHERE "miniAppId" = $1 ORDER BY "createdAt" DESC`,
    [id],
  );
}

// ---------------------------------------------------------------- lifecycle

let buildSeq = 0;

/** Jenkins reports the end of a Super App build (test or release). */
export async function buildResult(
  e: E2eApp,
  status: 'SUCCESS' | 'FAILED',
  buildType = 'release',
) {
  return e
    .http()
    .post('/release-assembly/build-callback')
    .set(callbackHeaders)
    .send({
      releaseVersion: `v0.${Date.now() % 100000}.${buildSeq++}`,
      status,
      buildType,
    });
}

export const action = (
  e: E2eApp,
  who: { auth: Record<string, string> },
  id: string,
  name: string,
  body: any = {},
) => e.http().post(`/mini-apps/${id}/${name}`).set(who.auth).send(body);

export async function newDraft(
  e: E2eApp,
  dev: Staff,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const res = await e
    .http()
    .post('/mini-apps/draft')
    .set(dev.auth)
    .send(webviewApp(overrides));
  if (res.status !== 201)
    throw new Error(
      `create failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  return data(res).id;
}

export type Stage =
  'IN_REVIEW' | 'APPROVED' | 'TESTING' | 'TEST_PASSED' | 'LIVE';

/** A new app walked to this stage through the real endpoints. */
export async function appAt(
  e: E2eApp,
  dev: Staff,
  admin: Staff,
  stage: Stage,
): Promise<string> {
  const id = await newDraft(e, dev);
  const step = async (res: Promise<any> | any, what: string) => {
    const r = await res;
    if (r.status >= 300)
      throw new Error(
        `${what} failed (${r.status}): ${JSON.stringify(r.body)}`,
      );
  };
  await step(action(e, dev, id, 'submit'), 'submit');
  await step(scanResult(e, id, 'PASSED'), 'scan');
  if (stage === 'IN_REVIEW') return id;
  await step(action(e, admin, id, 'approve'), 'approve');
  if (stage === 'APPROVED') return id;
  await step(action(e, admin, id, 'start-testing'), 'start-testing');
  await step(buildResult(e, 'SUCCESS'), 'test build');
  if (stage === 'TESTING') return id;
  await step(action(e, admin, id, 'pass-testing'), 'pass-testing');
  if (stage === 'TEST_PASSED') return id;
  await step(action(e, admin, id, 'activate'), 'activate');
  await step(buildResult(e, 'SUCCESS'), 'release build');
  return id;
}

/** The version row statuses, newest first. */
export async function stages(e: E2eApp, id: string): Promise<string[]> {
  return (await versionRows(e, id)).map((v) => `${v.version}:${v.status}`);
}

/** Whether a phone of this build lists the app. */
export async function listed(
  e: E2eApp,
  phone: PhoneUser,
  id: string,
  build?: 'debug' | 'release',
) {
  const row = await appRow(e, id);
  const res = await e
    .http()
    .get('/mobile/mini-apps')
    .query({ search: row.name, limit: 50 })
    .set(phone.auth(build));
  if (res.status !== 200)
    throw new Error(
      `catalog failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  const items: any[] = data(res)?.items ?? [];
  return items.some((x) => x.appId === row.appId);
}

/** The status of a phone of this build opening the app (token exchange). */
export async function opens(
  e: E2eApp,
  phone: PhoneUser,
  id: string,
  build?: 'debug' | 'release',
) {
  const appId = (await appRow(e, id)).appId;
  return (
    await e
      .http()
      .post('/mobile/auth/token-exchange')
      .set(phone.auth(build))
      .send({ miniAppId: appId })
  ).status;
}

export async function events(e: E2eApp, id: string): Promise<string[]> {
  const rows = await e.db.query(
    `SELECT type FROM mini_app_status_events WHERE "miniAppId" = $1 ORDER BY "createdAt", id`,
    [id],
  );
  return rows.map((r: any) => r.type);
}
