import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsAllowedToCapabilityDefinitions1796100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capability_definitions"
      ADD COLUMN IF NOT EXISTS "isAllowed" boolean NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capability_definitions"
      DROP COLUMN IF EXISTS "isAllowed";
    `);
  }
}
