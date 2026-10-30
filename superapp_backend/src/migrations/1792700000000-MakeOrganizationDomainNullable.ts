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

    // 2. Drop NOT NULL constraint on "organizations"."parentAuthority"
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

    // 4. Purge obsolete mock organization 'Fintech Center' and consolidate into 'Financial Technology Center'
    await queryRunner.query(`
      DO $$
      DECLARE
        legacy_id uuid;
        official_id uuid;
      BEGIN
        SELECT id INTO legacy_id FROM "organizations" WHERE name = 'Fintech Center' LIMIT 1;
        SELECT id INTO official_id FROM "organizations" WHERE name = 'Financial Technology Center' LIMIT 1;
        
        IF legacy_id IS NOT NULL AND official_id IS NOT NULL THEN
          UPDATE "user" SET "organizationId" = official_id WHERE "organizationId" = legacy_id;
          UPDATE "mini_apps" SET "organizationId" = official_id WHERE "organizationId" = legacy_id;
          UPDATE "organizations" SET "parentId" = official_id WHERE "parentId" = legacy_id;
          DELETE FROM "organizations" WHERE id = legacy_id;
        ELSIF legacy_id IS NOT NULL AND official_id IS NULL THEN
          UPDATE "organizations" SET name = 'Financial Technology Center', code = 'FTC' WHERE id = legacy_id;
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

    // Revert parentAuthority constraint
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

