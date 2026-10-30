import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeOrganizationParentAuthorityNullable1792710000000
  implements MigrationInterface
{
  name = 'MakeOrganizationParentAuthorityNullable1792710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop NOT NULL constraint on "organizations"."parentAuthority"
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'organizations' AND column_name = 'parentAuthority'
        ) THEN
          ALTER TABLE "organizations" ALTER COLUMN "parentAuthority" DROP NOT NULL;
        END IF;
      END $$;
    `);

    // 2. Drop NOT NULL constraint on "organizations"."domain" if still present
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

    // 3. Cascade-protect legacy user_roles foreign key if table exists
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
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'organizations' AND column_name = 'parentAuthority'
        ) THEN
          UPDATE "organizations" SET "parentAuthority" = 'Non-Bank Financial Services Authority' WHERE "parentAuthority" IS NULL;
          ALTER TABLE "organizations" ALTER COLUMN "parentAuthority" SET NOT NULL;
        END IF;
      END $$;
    `);
  }
}

