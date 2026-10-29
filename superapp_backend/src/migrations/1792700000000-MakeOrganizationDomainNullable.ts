import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeOrganizationDomainNullable1792700000000
  implements MigrationInterface
{
  name = 'MakeOrganizationDomainNullable1792700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop NOT NULL constraint on "organizations"."domain"
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'organizations' AND column_name = 'domain'
        ) THEN
          ALTER TABLE "organizations" ALTER COLUMN "domain" DROP NOT NULL;
        END IF;
      END $$;
    `);

    // 2. Cascade-protect legacy user_roles foreign key if table exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_86033897c009fcca8b6505d6be2') THEN
          ALTER TABLE "user_roles" DROP CONSTRAINT "FK_86033897c009fcca8b6505d6be2";
          ALTER TABLE "user_roles"
            ADD CONSTRAINT "FK_86033897c009fcca8b6505d6be2"
            FOREIGN KEY ("roleId") REFERENCES "role"("id")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore NOT NULL constraint with safe fallback for any null values
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'organizations' AND column_name = 'domain'
        ) THEN
          UPDATE "organizations" SET "domain" = 'fsa.gov.kh' WHERE "domain" IS NULL;
          ALTER TABLE "organizations" ALTER COLUMN "domain" SET NOT NULL;
        END IF;
      END $$;
    `);

    // Revert legacy user_roles foreign key constraint
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_86033897c009fcca8b6505d6be2') THEN
          ALTER TABLE "user_roles" DROP CONSTRAINT "FK_86033897c009fcca8b6505d6be2";
          ALTER TABLE "user_roles"
            ADD CONSTRAINT "FK_86033897c009fcca8b6505d6be2"
            FOREIGN KEY ("roleId") REFERENCES "role"("id")
            ON DELETE NO ACTION;
        END IF;
      END $$;
    `);
  }
}

