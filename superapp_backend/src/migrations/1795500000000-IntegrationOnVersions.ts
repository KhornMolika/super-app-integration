import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalization step 4a (expand): each version holds its integration, and
 * the app points to its live version.
 *
 *   mini_app_versions.integrationMethod   new (integrationConfig was there)
 *   mini_app_versions.homeWidget          new
 *   mini_apps.liveVersionId               new, the ACTIVE row (SET NULL)
 *
 * Backfill: the live row, or an unreleased app's working rows, from the
 * app's columns; a live app's DRAFT row from its revision. Older rows keep
 * the integrationConfig they already had. The mobile catalog builds its
 * items from the served version; mini_apps keeps its columns until 4b.
 */
export class IntegrationOnVersions1795500000000 implements MigrationInterface {
  name = 'IntegrationOnVersions1795500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "mini_app_versions"
        ADD COLUMN IF NOT EXISTS "integrationMethod" varchar(30),
        ADD COLUMN IF NOT EXISTS "homeWidget" jsonb
    `);
    await q.query(`ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "liveVersionId" uuid`);
    await q.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_mini_apps_live_version') THEN
          ALTER TABLE "mini_apps" ADD CONSTRAINT "FK_mini_apps_live_version"
            FOREIGN KEY ("liveVersionId") REFERENCES "mini_app_versions"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    // Live row; unreleased apps: their DRAFT/TESTING working rows
    await q.query(`
      UPDATE "mini_app_versions" v
         SET "integrationMethod" = m."integrationMethod",
             "integrationConfig" = m."integrationConfig",
             "homeWidget" = m."homeWidget"
        FROM "mini_apps" m
       WHERE v."miniAppId" = m.id
         AND (v."status" = 'ACTIVE'
              OR (v."status" IN ('DRAFT', 'TESTING') AND NOT EXISTS (
                    SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m.id AND a."status" = 'ACTIVE')))
    `);
    // A live app's DRAFT row: the revision's integration, else the app's
    await q.query(`
      UPDATE "mini_app_versions" v
         SET "integrationMethod" = COALESCE(v."revision"->>'integrationMethod', m."integrationMethod"),
             "integrationConfig" = COALESCE(v."revision"->'integrationConfig', m."integrationConfig"),
             "homeWidget" = CASE WHEN v."revision" ? 'homeWidget' THEN v."revision"->'homeWidget' ELSE m."homeWidget" END
        FROM "mini_apps" m
       WHERE v."miniAppId" = m.id
         AND v."status" = 'DRAFT'
         AND EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m.id AND a."status" = 'ACTIVE')
    `);
    await q.query(`
      UPDATE "mini_apps" m
         SET "liveVersionId" = (SELECT v.id FROM "mini_app_versions" v
                                 WHERE v."miniAppId" = m.id AND v."status" = 'ACTIVE'
                                 ORDER BY v."createdAt" DESC LIMIT 1)
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "mini_apps" DROP CONSTRAINT IF EXISTS "FK_mini_apps_live_version"`);
    await q.query(`ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "liveVersionId"`);
    await q.query(`
      ALTER TABLE "mini_app_versions"
        DROP COLUMN IF EXISTS "homeWidget",
        DROP COLUMN IF EXISTS "integrationMethod"
    `);
  }
}
