import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandEnterpriseRbacRoles1796400000000 implements MigrationInterface {
  name = 'ExpandEnterpriseRbacRoles1796400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure ORG_ADMIN exists
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        'ORG_ADMIN',
        'Organization Administrator: supervises mini apps, users, banners and audit trail of their own organization',
        true,
        now(),
        now()
      )
      ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
    `);

    // 2. Insert PLATFORM_ADMIN, APP_REVIEWER, SECURITY_OFFICER, MA_TESTER
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
      VALUES 
        (gen_random_uuid(), 'PLATFORM_ADMIN', 'Platform Administrator: oversees ecosystem operations, organization governance, and capabilities', true, now(), now()),
        (gen_random_uuid(), 'APP_REVIEWER', 'Ecosystem Reviewer: evaluates submissions on the Review & Diff Deck and issues approve/reject verdicts', true, now(), now()),
        (gen_random_uuid(), 'SECURITY_OFFICER', 'Security & Compliance Auditor: inspects vulnerability findings, CycloneDX SBOM, and MinIO quarantine', true, now(), now()),
        (gen_random_uuid(), 'MA_TESTER', 'QA & Sandbox Tester: verifies test builds and sandbox capabilities in staging environments', true, now(), now())
      ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
    `);

    // 3. Copy permissions from ADMIN to ORG_ADMIN if table exists
    await queryRunner.query(`
      DO $$
      DECLARE
        v_admin_id uuid;
        v_org_admin_id uuid;
      BEGIN
        SELECT "id" INTO v_admin_id FROM "roles" WHERE "name" = 'ADMIN' LIMIT 1;
        SELECT "id" INTO v_org_admin_id FROM "roles" WHERE "name" = 'ORG_ADMIN' LIMIT 1;
        
        IF v_admin_id IS NOT NULL AND v_org_admin_id IS NOT NULL THEN
          INSERT INTO "role_permissions" ("roleId", "permissionId")
          SELECT v_org_admin_id, "permissionId"
          FROM "role_permissions"
          WHERE "roleId" = v_admin_id
          ON CONFLICT DO NOTHING;
        END IF;
      EXCEPTION
        WHEN undefined_table THEN
          -- Table role_permissions might not be initialized yet; Seeder handles relations on bootstrap
          NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Keep roles intact for safety during rollback
  }
}
