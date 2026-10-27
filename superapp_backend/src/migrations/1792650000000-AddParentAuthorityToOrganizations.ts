import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParentAuthorityToOrganizations1792650000000 implements MigrationInterface {
  name = 'AddParentAuthorityToOrganizations1792650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "parentAuthority" character varying NOT NULL DEFAULT 'Non-Bank Financial Services Authority'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN IF EXISTS "parentAuthority"`,
    );
  }
}
