import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalization step 3b (contract): the pending revision lives only on its
 * version row (mini_app_versions.revision, added in 3a).
 *
 * Before the column goes, every revision still on mini_apps is copied:
 *   - live app (has an ACTIVE row): to its DRAFT row, made if missing;
 *   - unreleased app: to its newest DRAFT/TESTING working row.
 * Capability rows of a newly made DRAFT row are written on the app's next
 * save (MiniAppVersionsService.persistRevision).
 *
 * down adds the column back and fills it from the same rows.
 */

const ISO_DATE = `'^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:?\\d{2})?)?$'`;

/** Same rule as revisionVersionOf() in versions/version-capabilities.ts. */
const REVISION_VERSION = `
  COALESCE(
    m."pendingRevision"->>'version',
    m."pendingRevision"->>'packageVersion',
    CASE WHEN m."currentReleaseVersion" IS NULL THEN '1.1.0'
         ELSE '1.' || (COALESCE(NULLIF(regexp_replace(split_part(m."currentReleaseVersion", '.', 2), '[^0-9]', '', 'g'), '')::int, 0) + 1) || '.0'
    END)`;

const REVIEW_FIELDS = `
  "revision" = m."pendingRevision",
  "reviewStatus" = left(m."pendingRevision"->>'revisionStatus', 30),
  "submittedAt" = CASE WHEN m."pendingRevision"->>'submittedAt' ~ ${ISO_DATE}
                       THEN (m."pendingRevision"->>'submittedAt')::timestamptz END`;

const IS_LIVE = (app: string) =>
  `EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = ${app} AND a."status" = 'ACTIVE')`;

export class DropPendingRevisionFromMiniApps1795300000000 implements MigrationInterface {
  name = 'DropPendingRevisionFromMiniApps1795300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mini_apps' AND column_name = 'pendingRevision'`,
    );
    if (!hasColumn.length) return;

    // 1. Live apps with a revision but no DRAFT row get one
    await queryRunner.query(`
      INSERT INTO "mini_app_versions" ("miniAppId", "version", "status", "changelog")
      SELECT m.id, ${REVISION_VERSION}, 'DRAFT', m."pendingRevision"->>'changelog'
        FROM "mini_apps" m
       WHERE jsonb_typeof(m."pendingRevision") = 'object'
         AND ${IS_LIVE('m.id')}
         AND NOT EXISTS (SELECT 1 FROM "mini_app_versions" d
                          WHERE d."miniAppId" = m.id AND d."status" = 'DRAFT')
    `);

    // 2. Live apps: the revision goes to the DRAFT row
    await queryRunner.query(`
      UPDATE "mini_app_versions" v SET ${REVIEW_FIELDS}
        FROM "mini_apps" m
       WHERE v."miniAppId" = m.id
         AND v."status" = 'DRAFT'
         AND jsonb_typeof(m."pendingRevision") = 'object'
         AND ${IS_LIVE('m.id')}
    `);

    // 3. Unreleased apps: to the newest working row
    await queryRunner.query(`
      UPDATE "mini_app_versions" v SET ${REVIEW_FIELDS}
        FROM "mini_apps" m
       WHERE v."miniAppId" = m.id
         AND jsonb_typeof(m."pendingRevision") = 'object'
         AND NOT ${IS_LIVE('m.id')}
         AND v.id = (SELECT w.id FROM "mini_app_versions" w
                      WHERE w."miniAppId" = m.id AND w."status" IN ('DRAFT', 'TESTING')
                      ORDER BY w."createdAt" DESC LIMIT 1)
    `);

    await queryRunner.query(`ALTER TABLE "mini_apps" DROP COLUMN "pendingRevision"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "pendingRevision" jsonb`);
    await queryRunner.query(`
      UPDATE "mini_apps" m
         SET "pendingRevision" = (
           SELECT v."revision" FROM "mini_app_versions" v
            WHERE v."miniAppId" = m.id
              AND v."revision" IS NOT NULL
              AND (v."status" = 'DRAFT' OR (v."status" = 'TESTING' AND NOT ${IS_LIVE('m.id')}))
            ORDER BY v."createdAt" DESC LIMIT 1)
    `);
  }
}
