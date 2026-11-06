import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLogoToOrganizations1792730000000 implements MigrationInterface {
  name = 'AddLogoToOrganizations1792730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "logo" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations" DROP COLUMN IF EXISTS "logo";
    `);
  }
}
