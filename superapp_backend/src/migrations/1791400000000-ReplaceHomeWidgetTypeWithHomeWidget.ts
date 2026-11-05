import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the central `homeWidgetType` string with a per-app `homeWidget`
 * jsonb object ({ widgetClass | viewId | url, verifiedClass? }) that the mini
 * app declares itself. null = no Home widget. Existing homeWidgetType values
 * are dropped (the feature was never released).
 */
export class ReplaceHomeWidgetTypeWithHomeWidget1791400000000 implements MigrationInterface {
  name = 'ReplaceHomeWidgetTypeWithHomeWidget1791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "homeWidgetType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "homeWidget" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "homeWidget"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "homeWidgetType" character varying`,
    );
  }
}
