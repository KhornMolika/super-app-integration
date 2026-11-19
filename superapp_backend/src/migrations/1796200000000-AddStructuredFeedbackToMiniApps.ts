import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStructuredFeedbackToMiniApps1796200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mini_apps"
      ADD COLUMN IF NOT EXISTS "structuredFeedback" jsonb DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mini_apps"
      DROP COLUMN IF EXISTS "structuredFeedback";
    `);
  }
}
