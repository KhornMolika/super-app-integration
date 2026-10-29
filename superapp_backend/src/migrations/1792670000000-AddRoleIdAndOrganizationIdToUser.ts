import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleIdAndOrganizationIdToUser1792670000000 implements MigrationInterface {
  name = 'AddRoleIdAndOrganizationIdToUser1792670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add direct roleId and organizationId columns to "user" table
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "roleId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "organizationId" uuid`,
    );

    // 2. Backfill roleId from legacy user_roles join table if it exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
          UPDATE "user" u
          SET "roleId" = ur."roleId"
          FROM "user_roles" ur
          WHERE u.id = ur."userId" AND u."roleId" IS NULL;
        END IF;
      END $$;
    `);

    // 3. Fallback: if any user still has no roleId, assign the SUPER_ADMIN or ADMIN role
    await queryRunner.query(`
      DO $$
      DECLARE
        default_role_id uuid;
      BEGIN
        SELECT id INTO default_role_id FROM "role" WHERE name IN ('SUPER_ADMIN', 'ADMIN') LIMIT 1;
        IF default_role_id IS NOT NULL THEN
          UPDATE "user" SET "roleId" = default_role_id WHERE "roleId" IS NULL;
        END IF;
      END $$;
    `);

    // 4. Backfill organizationId with root FSA / FTC organization if null
    await queryRunner.query(`
      DO $$
      DECLARE
        default_org_id uuid;
      BEGIN
        SELECT id INTO default_org_id FROM "organizations"
        WHERE code IN ('FTC', 'FSA') OR LOWER(name) LIKE '%financial technology center%'
        LIMIT 1;
        IF default_org_id IS NOT NULL THEN
          UPDATE "user" SET "organizationId" = default_org_id WHERE "organizationId" IS NULL;
        END IF;
      END $$;
    `);

    // 5. Add foreign key constraints safely
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_roleId') THEN
          ALTER TABLE "user"
          ADD CONSTRAINT "FK_user_roleId"
          FOREIGN KEY ("roleId") REFERENCES "role"("id")
          ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_organizationId') THEN
          ALTER TABLE "user"
          ADD CONSTRAINT "FK_user_organizationId"
          FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 6. Create index on roleId and organizationId for performant joins
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_roleId" ON "user" ("roleId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_organizationId" ON "user" ("organizationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_organizationId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_roleId"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_user_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_user_roleId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "roleId"`,
    );
  }
}
