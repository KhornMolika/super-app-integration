import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * superapp_capabilities.publishedAt: when a build of that Super App version
 * succeeded. A version without it was never published, so the next test build
 * reuses it instead of using up a new number (failed builds, or the mini app
 * that held it was deleted).
 *
 * Every version except the newest is marked published: they are history. The
 * newest stays unmarked; it is reused only when no mini app is building,
 * testing or live with it.
 */
export class AddSuperAppVersionPublishedAt1794700000000 implements MigrationInterface {
  name = 'AddSuperAppVersionPublishedAt1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "superapp_capabilities" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMPTZ NULL`);
    await queryRunner.query(`
      UPDATE "superapp_capabilities" c
      SET "publishedAt" = c."createdAt"
      WHERE c."publishedAt" IS NULL
        AND c."createdAt" < (SELECT MAX("createdAt") FROM "superapp_capabilities")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "superapp_capabilities" DROP COLUMN IF EXISTS "publishedAt"`);
  }
}
