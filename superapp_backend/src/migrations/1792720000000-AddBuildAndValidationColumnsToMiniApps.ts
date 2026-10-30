import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuildAndValidationColumnsToMiniApps1792720000000
  implements MigrationInterface
{
  name = 'AddBuildAndValidationColumnsToMiniApps1792720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "validationStatus" character varying DEFAULT 'PENDING';
      ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "validationStages" jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "validationReport" jsonb;
      ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "validationErrors" jsonb;
      ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "buildStatus" character varying DEFAULT 'IDLE';
      ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "buildStages" jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "buildError" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "buildError";
      ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "buildStages";
      ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "buildStatus";
      ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "validationErrors";
      ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "validationReport";
      ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "validationStages";
      ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "validationStatus";
    `);
  }
}

