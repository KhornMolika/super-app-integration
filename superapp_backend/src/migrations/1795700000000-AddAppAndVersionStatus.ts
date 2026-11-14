import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 6a (expand): one status per question.
 *
 *   mini_apps.status            DRAFT | LIVE | SUSPENDED | ARCHIVED
 *   mini_app_versions.status    the version's stage while it is worked on
 *                               (DRAFT, SUBMITTED, IN_REVIEW, CHANGES_REQUESTED,
 *                               REJECTED, APPROVED, TESTING, TEST_PASSED), then
 *                               ACTIVE / PREVIOUS / DEPRECATED as before
 *
 * Filled from lifecycleStatus and availabilityStatus with the same rules as
 * src/miniapps/status/app-status.ts. Those columns stay until 6e.
 *
 * mini_apps had a "status" column in the first schema; nothing has mapped it
 * since its values were copied into lifecycleStatus (AlignMiniAppAndPlatform-
 * Schema). That leftover is dropped and the column made anew.
 */

const MARK = 'Phase 6 app status';

/** SQL: the stage an old lifecycle (or revision status) value stands for; NULL = leave the row. */
export function stageCase(expr: string): string {
  return `CASE ${expr}
    WHEN 'DRAFT' THEN 'DRAFT' WHEN 'QUARANTINE' THEN 'DRAFT'
    WHEN 'SUBMITTED' THEN 'SUBMITTED'
    WHEN 'IN_REVIEW' THEN 'IN_REVIEW'
    WHEN 'CHANGES_REQUESTED' THEN 'CHANGES_REQUESTED'
    WHEN 'REJECTED' THEN 'REJECTED'
    WHEN 'APPROVED' THEN 'APPROVED' WHEN 'APPROVED_FOR_TESTING' THEN 'APPROVED'
    WHEN 'BUILDING' THEN 'APPROVED' WHEN 'BUILDING_STAGE_1' THEN 'APPROVED' WHEN 'BUILD_FAILED' THEN 'APPROVED'
    WHEN 'TESTING' THEN 'TESTING'
    WHEN 'TEST_PASSED' THEN 'TEST_PASSED' WHEN 'BUILDING_STAGE_2' THEN 'TEST_PASSED'
    ELSE NULL END`;
}

/** SQL: the app status for the old pair. */
export function appStatusCase(lifecycle: string, availability: string): string {
  return `CASE
    WHEN ${lifecycle} IN ('ARCHIVED', 'TERMINATED') THEN 'ARCHIVED'
    WHEN ${lifecycle} = 'SUSPENDED' OR ${availability} = 'SUSPENDED' THEN 'SUSPENDED'
    WHEN ${lifecycle} = 'ACTIVE' OR ${availability} = 'PRODUCTION' THEN 'LIVE'
    ELSE 'DRAFT' END`;
}

const HAS_LIVE = (app: string) =>
  `EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = ${app} AND a."status" = 'ACTIVE')`;

const UPPER = (col: string) => `UPPER(COALESCE(${col}, ''))`;

export class AddAppAndVersionStatus1795700000000 implements MigrationInterface {
  name = 'AddAppAndVersionStatus1795700000000';

  public async up(q: QueryRunner): Promise<void> {
    const existing: { comment: string | null }[] = await q.query(`
      SELECT col_description('"mini_apps"'::regclass, a.attnum) AS comment
        FROM pg_attribute a
       WHERE a.attrelid = '"mini_apps"'::regclass AND a.attname = 'status' AND NOT a.attisdropped
    `);
    if (existing.length && existing[0].comment !== MARK) {
      await q.query(`ALTER TABLE "mini_apps" DROP COLUMN "status"`);
    }
    await q.query(`ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'DRAFT'`);
    await q.query(`COMMENT ON COLUMN "mini_apps"."status" IS '${MARK}'`);

    const cols: { column_name: string }[] = await q.query(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'mini_apps' AND column_name IN ('lifecycleStatus', 'availabilityStatus')
    `);
    if (cols.length === 2) {
      await q.query(`
        UPDATE "mini_apps" m
           SET "status" = ${appStatusCase(UPPER('m."lifecycleStatus"'), UPPER('m."availabilityStatus"'))}
      `);
      // The row an unreleased app works on takes its lifecycle stage
      await q.query(`
        UPDATE "mini_app_versions" v
           SET "status" = COALESCE(${stageCase(UPPER('m."lifecycleStatus"'))}, v."status")
          FROM "mini_apps" m
         WHERE v."miniAppId" = m.id AND v."status" IN ('DRAFT', 'TESTING') AND NOT ${HAS_LIVE('m.id')}
      `);
    }
    // A live app's revision row takes its review stage
    const hasReview: unknown[] = await q.query(`
      SELECT 1 FROM information_schema.columns WHERE table_name = 'mini_app_versions' AND column_name = 'reviewStatus'
    `);
    if (hasReview.length) {
      await q.query(`
        UPDATE "mini_app_versions" v
           SET "status" = COALESCE(${stageCase(UPPER('v."reviewStatus"'))}, v."status")
         WHERE v."status" = 'DRAFT' AND ${HAS_LIVE('v."miniAppId"')}
      `);
    }
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_mini_apps_status" ON "mini_apps" ("status")`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mini_app_versions_app_status" ON "mini_app_versions" ("miniAppId", "status")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_mini_app_versions_app_status"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_mini_apps_status"`);
    // Stages back to the two working statuses (a live app's revision row was always DRAFT)
    await q.query(`
      UPDATE "mini_app_versions" v
         SET "status" = CASE
           WHEN ${HAS_LIVE('v."miniAppId"')} THEN 'DRAFT'
           WHEN v."status" IN ('APPROVED', 'TESTING', 'TEST_PASSED') THEN 'TESTING'
           ELSE 'DRAFT' END
       WHERE v."status" NOT IN ('ACTIVE', 'PREVIOUS', 'DEPRECATED', 'DRAFT')
    `);
    await q.query(`ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "status"`);
  }
}
