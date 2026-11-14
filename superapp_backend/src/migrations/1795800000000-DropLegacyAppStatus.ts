import { MigrationInterface, QueryRunner } from 'typeorm';
import { appStatusCase, stageCase } from './1795700000000-AddAppAndVersionStatus';

/**
 * Phase 6e (contract): one status per question, the old columns go.
 *
 *   mini_apps.lifecycleStatus, availabilityStatus   -> mini_apps.status and
 *                                                      the version row stage
 *   mini_apps.currentReleaseVersion                 -> the live (ACTIVE) row's
 *                                                      version, else the
 *                                                      working row's
 *   mini_apps.draftVersion                          nothing wrote it
 *   mini_app_versions.reviewStatus                  -> the row status (the
 *                                                      revision keeps its own
 *                                                      revisionStatus)
 *
 * mini_apps.activeTestVersion stays: it is the Super App test build an app
 * was last put in, not a mini app version, and the Super App service looks
 * apps up by it.
 *
 * Before the drop, the new columns are brought in line with the old ones one
 * last time (the app writes both since 6b, so this normally changes nothing).
 * down puts the columns back, filled from the new ones.
 */

const HAS_LIVE = (app: string) =>
  `EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = ${app} AND a."status" = 'ACTIVE')`;
const UPPER = (col: string) => `UPPER(COALESCE(${col}, ''))`;
const IN_PROGRESS = `('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED', 'TESTING', 'TEST_PASSED')`;

export class DropLegacyAppStatus1795800000000 implements MigrationInterface {
  name = 'DropLegacyAppStatus1795800000000';

  public async up(q: QueryRunner): Promise<void> {
    const cols: { column_name: string }[] = await q.query(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'mini_apps'
         AND column_name IN ('lifecycleStatus', 'availabilityStatus', 'currentReleaseVersion')
    `);
    const has = (c: string) => cols.some((r) => r.column_name === c);

    if (has('lifecycleStatus') && has('availabilityStatus')) {
      await q.query(`
        UPDATE "mini_apps" m
           SET "status" = ${appStatusCase(UPPER('m."lifecycleStatus"'), UPPER('m."availabilityStatus"'))}
      `);
      await q.query(`
        UPDATE "mini_app_versions" v
           SET "status" = COALESCE(${stageCase(UPPER('m."lifecycleStatus"'))}, v."status")
          FROM "mini_apps" m
         WHERE v."miniAppId" = m.id AND v."status" IN ${IN_PROGRESS} AND NOT ${HAS_LIVE('m.id')}
      `);
    }
    if (has('currentReleaseVersion')) {
      // An unreleased app's version string lives on its working row
      await q.query(`
        UPDATE "mini_app_versions" v
           SET "version" = m."currentReleaseVersion"
          FROM "mini_apps" m
         WHERE v."miniAppId" = m.id AND v."status" IN ${IN_PROGRESS} AND NOT ${HAS_LIVE('m.id')}
           AND m."currentReleaseVersion" IS NOT NULL AND m."currentReleaseVersion" <> ''
           AND v."version" IS DISTINCT FROM m."currentReleaseVersion"
      `);
    }
    await q.query(`
      ALTER TABLE "mini_apps"
        DROP COLUMN IF EXISTS "lifecycleStatus",
        DROP COLUMN IF EXISTS "availabilityStatus",
        DROP COLUMN IF EXISTS "currentReleaseVersion",
        DROP COLUMN IF EXISTS "draftVersion"
    `);
    await q.query(`ALTER TABLE "mini_app_versions" DROP COLUMN IF EXISTS "reviewStatus"`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "mini_apps"
        ADD COLUMN IF NOT EXISTS "lifecycleStatus" varchar NOT NULL DEFAULT 'DRAFT',
        ADD COLUMN IF NOT EXISTS "availabilityStatus" varchar NOT NULL DEFAULT 'TESTING',
        ADD COLUMN IF NOT EXISTS "currentReleaseVersion" varchar,
        ADD COLUMN IF NOT EXISTS "draftVersion" varchar
    `);
    await q.query(`ALTER TABLE "mini_app_versions" ADD COLUMN IF NOT EXISTS "reviewStatus" varchar(30)`);
    // The old values back from the new ones (status/app-status.ts lifecycleOf, availabilityOf)
    await q.query(`
      UPDATE "mini_apps" m
         SET "availabilityStatus" = CASE m."status"
               WHEN 'LIVE' THEN 'PRODUCTION' WHEN 'SUSPENDED' THEN 'SUSPENDED' WHEN 'ARCHIVED' THEN 'SUSPENDED'
               ELSE 'TESTING' END,
             "lifecycleStatus" = CASE
               WHEN m."status" = 'ARCHIVED' THEN 'ARCHIVED'
               WHEN m."status" = 'LIVE' OR (m."status" = 'SUSPENDED' AND ${HAS_LIVE('m.id')}) THEN 'ACTIVE'
               ELSE COALESCE((
                 SELECT w."status" FROM "mini_app_versions" w
                  WHERE w."miniAppId" = m.id AND w."status" IN ${IN_PROGRESS}
                  ORDER BY w."createdAt" DESC LIMIT 1), 'DRAFT') END,
             "currentReleaseVersion" = (
               SELECT s."version" FROM "mini_app_versions" s
                WHERE s."miniAppId" = m.id AND s."status" IN ('ACTIVE', 'DRAFT', 'SUBMITTED', 'IN_REVIEW',
                      'CHANGES_REQUESTED', 'REJECTED', 'APPROVED', 'TESTING', 'TEST_PASSED')
                ORDER BY (s."status" = 'ACTIVE') DESC, s."createdAt" DESC LIMIT 1)
    `);
    // A live app's revision row: its stage was its review state
    await q.query(`
      UPDATE "mini_app_versions" v SET "reviewStatus" = v."status"
       WHERE v."status" IN ${IN_PROGRESS} AND ${HAS_LIVE('v."miniAppId"')}
    `);
  }
}
