/**
 * Lists mini app collaborator rows that grant nothing: the collaborator is not a
 * member of the app's organization (another organization, or no staff profile).
 * The access policy ignores these rows (collaboration never crosses
 * organizations); they could only be created before that rule was enforced.
 *
 * READ-ONLY: prints the rows and the SQL that would delete them. Review the
 * list, then run the printed DELETE yourself.
 *
 * Usage (from superapp_backend/, DB_* from .env.<NODE_ENV> / .env):
 *   node scripts/list-cross-org-collaborators.mjs
 *   node scripts/list-cross-org-collaborators.mjs --json
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const root = resolve(__dirname, '..');
  for (const envFile of [
    resolve(root, `.env.${process.env.NODE_ENV || 'development'}`),
    resolve(root, '.env'),
  ]) {
    if (!existsSync(envFile)) continue;
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

const QUERY = `
  SELECT c."id"                AS "rowId",
         c."role"              AS "role",
         c."createdAt"         AS "addedAt",
         a."appId"             AS "appId",
         a."name"              AS "appName",
         app_org."name"        AS "appOrganization",
         i."email"             AS "collaboratorEmail",
         i."name"              AS "collaboratorName",
         COALESCE(user_org."name", '(no staff profile)') AS "collaboratorOrganization"
  FROM "mini_app_collaborators" c
  JOIN "mini_apps" a           ON a."id" = c."miniAppId"
  JOIN "identities" i          ON i."id" = c."identityId"
  LEFT JOIN "organizations" app_org ON app_org."id" = a."organizationId"
  LEFT JOIN "staff_profiles" sp     ON sp."identityId" = c."identityId"
  LEFT JOIN "organizations" user_org ON user_org."id" = sp."organizationId"
  WHERE sp."organizationId" IS DISTINCT FROM a."organizationId"
  ORDER BY a."appId", i."email"
`;

async function main() {
  loadEnv();
  const client = new pg.Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'superapp_db',
  });
  await client.connect();
  try {
    // Read-only transaction: this script never changes data
    await client.query('BEGIN READ ONLY');
    const { rows } = await client.query(QUERY);
    await client.query('ROLLBACK');

    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }
    if (rows.length === 0) {
      console.log(
        'No cross-organization collaborator rows. Nothing to clean up.',
      );
      return;
    }
    console.log(
      `${rows.length} collaborator row(s) outside the app's organization:\n`,
    );
    console.table(
      rows.map((r) => ({
        app: `${r.appId} (${r.appName})`,
        appOrg: r.appOrganization,
        collaborator: `${r.collaboratorEmail} (${r.collaboratorName})`,
        collaboratorOrg: r.collaboratorOrganization,
        role: r.role,
        addedAt: new Date(r.addedAt).toISOString().slice(0, 10),
      })),
    );
    const ids = rows.map((r) => `'${r.rowId}'`).join(',\n  ');
    console.log('\nAfter review, delete them with:\n');
    console.log(
      `DELETE FROM "mini_app_collaborators" WHERE "id" IN (\n  ${ids}\n);`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  // Connection failures arrive as an AggregateError with an empty message
  const detail =
    err.message ||
    (err.errors || [])
      .map((e) => `${e.code} ${e.address}:${e.port}`)
      .join(', ') ||
    err.code;
  console.error('Failed:', detail);
  process.exit(1);
});
