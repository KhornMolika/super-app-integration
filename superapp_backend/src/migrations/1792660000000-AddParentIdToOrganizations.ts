import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParentIdToOrganizations1792660000000 implements MigrationInterface {
  name = 'AddParentIdToOrganizations1792660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "parentId" uuid`,
    );
    await queryRunner.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_organizations_parentId'
        ) THEN
          ALTER TABLE "organizations"
          ADD CONSTRAINT "FK_organizations_parentId"
          FOREIGN KEY ("parentId") REFERENCES "organizations"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;`,
    );
    // Backfill: Auto-link subordinate organizations to root FSA/FTC if parentId is null
    await queryRunner.query(
      `DO $$
      DECLARE
        root_id uuid;
      BEGIN
        SELECT id INTO root_id FROM "organizations"
        WHERE code IN ('FSA', 'FTC') OR LOWER(name) LIKE '%financial technology center%' OR LOWER(name) LIKE '%non-bank financial services authority%'
        LIMIT 1;

        IF root_id IS NOT NULL THEN
          UPDATE "organizations"
          SET "parentId" = root_id
          WHERE "parentId" IS NULL AND "id" != root_id;
        END IF;
      END $$;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "FK_organizations_parentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN IF EXISTS "parentId"`,
    );
  }
}

