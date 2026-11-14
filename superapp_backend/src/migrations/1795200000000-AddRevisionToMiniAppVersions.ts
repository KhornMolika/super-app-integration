import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalization step 3a (expand): the DRAFT version row of a live app holds
 * the whole pending revision, not only its capabilities.
 *
 *   mini_app_versions.revision      the staged revision as saved
 *   mini_app_versions.reviewStatus  its review state (IN_REVIEW, DRAFT, TESTING, ...)
 *   mini_app_versions.submittedAt   when it was submitted
 *
 * MiniAppVersionsService keeps them in step with mini_apps.pendingRevision
 * from now on; this backfills the revisions already pending. The
 * pendingRevision column stays until step 3b moves the reads and writes.
 */

const ISO_DATE = `'^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:?\\d{2})?)?$'`;

export class AddRevisionToMiniAppVersions1795200000000 implements MigrationInterface {
  name = 'AddRevisionToMiniAppVersions1795200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mini_app_versions"
        ADD COLUMN IF NOT EXISTS "revision" jsonb,
        ADD COLUMN IF NOT EXISTS "reviewStatus" varchar(30),
        ADD COLUMN IF NOT EXISTS "submittedAt" timestamptz
    `);

    // The revision of each live app goes to its DRAFT row
    await queryRunner.query(`
      UPDATE "mini_app_versions" v
         SET "revision" = m."pendingRevision",
             "reviewStatus" = left(m."pendingRevision"->>'revisionStatus', 30),
             "submittedAt" = CASE
               WHEN m."pendingRevision"->>'submittedAt' ~ ${ISO_DATE}
               THEN (m."pendingRevision"->>'submittedAt')::timestamptz
             END
        FROM "mini_apps" m
       WHERE v."miniAppId" = m.id
         AND v."status" = 'DRAFT'
         AND jsonb_typeof(m."pendingRevision") = 'object'
         AND EXISTS (SELECT 1 FROM "mini_app_versions" a
                      WHERE a."miniAppId" = m.id AND a."status" = 'ACTIVE')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mini_app_versions"
        DROP COLUMN IF EXISTS "submittedAt",
        DROP COLUMN IF EXISTS "reviewStatus",
        DROP COLUMN IF EXISTS "revision"
    `);
  }
}
