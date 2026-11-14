import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertCaps } from './1795100000000-CreateMiniAppVersionCapabilities';

/**
 * Normalization step 2b-ii (contract): capabilities live only in
 * mini_app_version_capabilities.
 *
 *   mini_apps.capabilities           dropped (MiniApp.capabilities is filled
 *                                    from the version the app serves)
 *   mini_app_versions.permissions    dropped (MiniAppVersion.permissions is
 *                                    filled from its capability rows)
 *
 * Before the columns go, any live or working row still without capability
 * rows gets them from the JSON (same backfill as step 2a, which skips rows
 * that already have some). down adds the columns back filled from the rows.
 */
export class DropCapabilityJsonColumns1795400000000 implements MigrationInterface {
  name = 'DropCapabilityJsonColumns1795400000000';

  public async up(q: QueryRunner): Promise<void> {
    const cols: { table_name: string; column_name: string }[] = await q.query(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE (table_name = 'mini_apps' AND column_name = 'capabilities')
           OR (table_name = 'mini_app_versions' AND column_name = 'permissions')`,
    );
    const has = (t: string, c: string) => cols.some((r) => r.table_name === t && r.column_name === c);

    if (has('mini_apps', 'capabilities')) {
      await q.query(
        insertCaps(
          `SELECT m."id" AS "miniAppId", v."id" AS "versionId", m."capabilities" AS list
           FROM "mini_app_versions" v JOIN "mini_apps" m ON m."id" = v."miniAppId"
           WHERE v."status" = 'ACTIVE'
              OR (v."status" = 'TESTING' AND NOT EXISTS (
                    SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m."id" AND a."status" = 'ACTIVE'))`,
          true,
        ),
      );
      await q.query(
        insertCaps(
          `SELECT m."id" AS "miniAppId", v."id" AS "versionId", m."capabilities" AS list
           FROM "mini_app_versions" v JOIN "mini_apps" m ON m."id" = v."miniAppId"
           WHERE v."status" = 'DRAFT'
             AND NOT EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m."id" AND a."status" = 'ACTIVE')`,
          false,
        ),
      );
      await q.query(`ALTER TABLE "mini_apps" DROP COLUMN "capabilities"`);
    }
    if (has('mini_app_versions', 'permissions')) {
      await q.query(
        insertCaps(
          `SELECT v."miniAppId", v."id" AS "versionId", v."permissions" AS list
           FROM "mini_app_versions" v
           WHERE v."status" NOT IN ('ACTIVE', 'DRAFT', 'TESTING')`,
          true,
        ),
      );
      await q.query(`ALTER TABLE "mini_app_versions" DROP COLUMN "permissions"`);
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "mini_app_versions" ADD COLUMN IF NOT EXISTS "permissions" jsonb DEFAULT '[]'`);
    await q.query(`
      UPDATE "mini_app_versions" v
         SET "permissions" = COALESCE((
           SELECT jsonb_agg(c."declaration" ORDER BY c."position")
             FROM "mini_app_version_capabilities" c WHERE c."versionId" = v.id), '[]'::jsonb)
    `);
    await q.query(`ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "capabilities" jsonb DEFAULT '[]'`);
    // The version each app serves: ACTIVE, else its newest TESTING, else DRAFT row
    await q.query(`
      UPDATE "mini_apps" m
         SET "capabilities" = COALESCE((
           SELECT v."permissions" FROM "mini_app_versions" v
            WHERE v."miniAppId" = m.id AND v."status" IN ('ACTIVE', 'TESTING', 'DRAFT')
            ORDER BY CASE v."status" WHEN 'ACTIVE' THEN 0 WHEN 'TESTING' THEN 1 ELSE 2 END, v."createdAt" DESC
            LIMIT 1), '[]'::jsonb)
    `);
  }
}
