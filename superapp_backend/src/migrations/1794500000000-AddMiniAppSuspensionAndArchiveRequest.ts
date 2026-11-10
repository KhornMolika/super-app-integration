import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds mini_apps.suspension (why and by whom an app was suspended) and
 * mini_apps.archiveRequest (an ADMIN asking a SUPER_ADMIN to archive it).
 */
export class AddMiniAppSuspensionAndArchiveRequest1794500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "suspension" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "archiveRequest" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "archiveRequest"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "suspension"`,
    );
  }
}
