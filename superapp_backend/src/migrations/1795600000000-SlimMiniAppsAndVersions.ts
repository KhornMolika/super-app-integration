import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalization Phase 3c, last step (4b contract and slimming).
 *
 * mini_apps loses what belongs to a version or is unused:
 *   integrationConfig, homeWidget         -> the served version row
 *   verificationToken, isDomainVerified,
 *   domainVerifiedAt                      -> inside that row's integrationConfig
 *   sharingScope                          unused, dropped
 *
 * mini_app_versions loses its top-level leftovers (nothing writes them since
 * builds moved to mini_app_builds): packageName, gitRef, sourceType,
 * saVersion, artifactUrl, apkSize, checksum (as archiveChecksum),
 * buildNumber, jenkinsJobUrl are folded into integrationConfig (keys already
 * there win); the unmapped "type" column is dropped.
 *
 * Before anything is dropped, an app without any version row gets one, and
 * each app's integration is copied to the row it serves (ACTIVE, else its
 * working DRAFT/TESTING rows), so nothing is lost. down puts the mini_apps
 * columns back filled from those rows (the version leftovers stay folded).
 */

const SERVED = `(v."status" = 'ACTIVE' OR (v."status" IN ('DRAFT', 'TESTING') AND NOT EXISTS (
    SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = v."miniAppId" AND a."status" = 'ACTIVE')))`;

const FOLDED = ['packageName', 'gitRef', 'sourceType', 'saVersion', 'artifactUrl', 'apkSize', 'checksum', 'buildNumber', 'jenkinsJobUrl'];

export class SlimMiniAppsAndVersions1795600000000 implements MigrationInterface {
  name = 'SlimMiniAppsAndVersions1795600000000';

  public async up(q: QueryRunner): Promise<void> {
    const cols: { table_name: string; column_name: string }[] = await q.query(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE table_name IN ('mini_apps', 'mini_app_versions')`,
    );
    const has = (t: string, c: string) => cols.some((r) => r.table_name === t && r.column_name === c);

    if (has('mini_apps', 'integrationConfig')) {
      // 1. Every app has a row to hold its integration
      await q.query(`
        INSERT INTO "mini_app_versions" ("miniAppId", "version", "status", "releasedAt")
        SELECT m.id, COALESCE(m."currentReleaseVersion", '1.0.0'),
               CASE WHEN m."lifecycleStatus" = 'ACTIVE' THEN 'ACTIVE' ELSE 'DRAFT' END,
               CASE WHEN m."lifecycleStatus" = 'ACTIVE' THEN now() END
          FROM "mini_apps" m
         WHERE NOT EXISTS (SELECT 1 FROM "mini_app_versions" v WHERE v."miniAppId" = m.id)
      `);
      // 2. The served row takes the app's integration (the app's columns are the truth until now)
      await q.query(`
        UPDATE "mini_app_versions" v
           SET "integrationMethod" = m."integrationMethod",
               "integrationConfig" = COALESCE(m."integrationConfig", '{}'::jsonb) || jsonb_build_object(
                 'verificationToken', m."verificationToken",
                 'isDomainVerified', COALESCE(m."isDomainVerified", false),
                 -- A timestamp without time zone: copied as the same wall-clock value it was read as
                 'domainVerifiedAt', to_char(m."domainVerifiedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS')),
               "homeWidget" = m."homeWidget"
          FROM "mini_apps" m
         WHERE v."miniAppId" = m.id AND ${SERVED}
      `);
      await q.query(`
        UPDATE "mini_apps" m SET "liveVersionId" = (
          SELECT v.id FROM "mini_app_versions" v
           WHERE v."miniAppId" = m.id AND v."status" = 'ACTIVE' ORDER BY v."createdAt" DESC LIMIT 1)
      `);
      await q.query(`
        ALTER TABLE "mini_apps"
          DROP COLUMN IF EXISTS "integrationConfig",
          DROP COLUMN IF EXISTS "homeWidget",
          DROP COLUMN IF EXISTS "verificationToken",
          DROP COLUMN IF EXISTS "isDomainVerified",
          DROP COLUMN IF EXISTS "domainVerifiedAt"
      `);
    }
    await q.query(`ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "sharingScope"`);

    const folded = FOLDED.filter((c) => has('mini_app_versions', c));
    if (folded.length) {
      const pairs = folded
        .map((c) => `'${c === 'checksum' ? 'archiveChecksum' : c}', v."${c}"`)
        .join(', ');
      // Existing integrationConfig keys win over the folded columns
      await q.query(`
        UPDATE "mini_app_versions" v
           SET "integrationConfig" = jsonb_strip_nulls(jsonb_build_object(${pairs})) || COALESCE(v."integrationConfig", '{}'::jsonb)
         WHERE ${folded.map((c) => `v."${c}" IS NOT NULL`).join(' OR ')}
      `);
      await q.query(
        `ALTER TABLE "mini_app_versions" ${folded.map((c) => `DROP COLUMN IF EXISTS "${c}"`).join(', ')}`,
      );
    }
    await q.query(`ALTER TABLE "mini_app_versions" DROP COLUMN IF EXISTS "type"`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "mini_apps"
        ADD COLUMN IF NOT EXISTS "integrationConfig" jsonb,
        ADD COLUMN IF NOT EXISTS "homeWidget" jsonb,
        ADD COLUMN IF NOT EXISTS "verificationToken" varchar,
        ADD COLUMN IF NOT EXISTS "isDomainVerified" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "domainVerifiedAt" timestamp,
        ADD COLUMN IF NOT EXISTS "sharingScope" varchar NOT NULL DEFAULT 'GLOBAL'
    `);
    await q.query(`ALTER TABLE "mini_app_versions" ADD COLUMN IF NOT EXISTS "type" varchar NOT NULL DEFAULT 'PRODUCTION'`);
    await q.query(`
      UPDATE "mini_apps" m
         SET "integrationConfig" = s.cfg - 'verificationToken' - 'isDomainVerified' - 'domainVerifiedAt',
             "homeWidget" = s."homeWidget",
             "verificationToken" = s.cfg->>'verificationToken',
             "isDomainVerified" = COALESCE((s.cfg->>'isDomainVerified')::boolean, false),
             "domainVerifiedAt" = NULLIF(s.cfg->>'domainVerifiedAt', '')::timestamp
        FROM (
          SELECT DISTINCT ON (v."miniAppId") v."miniAppId", v."integrationConfig" AS cfg, v."homeWidget"
            FROM "mini_app_versions" v
           WHERE v."status" IN ('ACTIVE', 'TESTING', 'DRAFT')
           ORDER BY v."miniAppId", CASE v."status" WHEN 'ACTIVE' THEN 0 WHEN 'TESTING' THEN 1 ELSE 2 END, v."createdAt" DESC
        ) s
       WHERE s."miniAppId" = m.id
    `);
  }
}
