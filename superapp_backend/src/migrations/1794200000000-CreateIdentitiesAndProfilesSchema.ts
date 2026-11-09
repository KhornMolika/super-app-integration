import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentitiesAndProfilesSchema1794200000000
  implements MigrationInterface
{
  name = 'CreateIdentitiesAndProfilesSchema1794200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasRoleTable = await queryRunner.hasTable('role');
    const roleTable = hasRoleTable ? 'role' : 'roles';

    const hasOrgTable = await queryRunner.hasTable('organizations');
    const orgTable = hasOrgTable ? 'organizations' : 'organization';

    // 1. Create identities table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "identities" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "email" VARCHAR NOT NULL,
        "name" VARCHAR NOT NULL,
        "honorific" VARCHAR NULL,
        "avatarKey" VARCHAR NULL,
        "avatarUpdatedAt" TIMESTAMPTZ NULL,
        "passwordHash" VARCHAR NOT NULL,
        "status" VARCHAR NOT NULL DEFAULT 'ACTIVE',
        "emailVerifiedAt" TIMESTAMPTZ NULL,
        "failedLoginCount" INT NOT NULL DEFAULT 0,
        "lockedUntil" TIMESTAMPTZ NULL,
        "sessionsRevokedAt" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_identities_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_identities_email" UNIQUE ("email"),
        CONSTRAINT "CHK_identities_email_lowercase" CHECK ("email" = lower("email"))
      );
    `);

    // 2. Create staff_profiles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_profiles" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "identityId" UUID NOT NULL,
        "organizationId" UUID NOT NULL,
        "roleId" UUID NOT NULL,
        "staffId" VARCHAR(50) NULL,
        "position" VARCHAR(100) NULL,
        "phoneNumber" VARCHAR(30) NULL,
        "externalId" VARCHAR(100) NULL,
        "status" VARCHAR NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_staff_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_staff_profiles_identityId" UNIQUE ("identityId"),
        CONSTRAINT "FK_staff_profiles_identity" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_staff_profiles_organization" FOREIGN KEY ("organizationId") REFERENCES "${orgTable}"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_staff_profiles_role" FOREIGN KEY ("roleId") REFERENCES "${roleTable}"("id") ON DELETE RESTRICT
      );
    `);

    // 3. Create consumer_profiles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "consumer_profiles" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "identityId" UUID NOT NULL,
        "phoneNumber" VARCHAR(30) NULL,
        "deletionRequestedAt" TIMESTAMPTZ NULL,
        "purgeAfter" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_consumer_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_consumer_profiles_identityId" UNIQUE ("identityId"),
        CONSTRAINT "FK_consumer_profiles_identity" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE
      );
    `);

    // 4. Add targetAudience to mini_apps
    await queryRunner.query(`
      ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "targetAudience" VARCHAR(50) NOT NULL DEFAULT 'PUBLIC';
    `);

    // 5/6. Backfill from legacy tables. Legacy schemas drifted across
    // environments (e.g. "user" never had staffId/position/phoneNumber, and
    // end_users never had phoneNumber), so every legacy column is resolved
    // against information_schema and falls back to NULL/default when absent.
    const legacyUserTable = await this.firstExistingTable(queryRunner, ['users', 'user']);
    if (legacyUserTable) {
      const u = await this.columnResolver(queryRunner, legacyUserTable, 'u');

      await queryRunner.query(`
        INSERT INTO "identities" ("id", "email", "name", "passwordHash", "status", "failedLoginCount", "lockedUntil", "createdAt", "updatedAt")
        SELECT DISTINCT ON (lower(trim(u."email")))
          u."id",
          lower(trim(u."email")),
          COALESCE(${u('name', 'NULL')}, lower(trim(u."email"))),
          COALESCE(${u('passwordHash')}, ''),
          COALESCE(${u('status')}::text, 'ACTIVE'),
          0,
          NULL,
          COALESCE(${u('createdAt')}, NOW()),
          COALESCE(${u('updatedAt')}, NOW())
        FROM "${legacyUserTable}" u
        WHERE u."email" IS NOT NULL
        ORDER BY lower(trim(u."email")), ${u('createdAt', 'NOW()')} ASC
        ON CONFLICT DO NOTHING;
      `);

      const hasUserRolesTable = await queryRunner.hasTable('user_roles');
      const roleExpr = hasUserRolesTable
        ? `COALESCE(${u('roleId')}, ur."roleId")`
        : u('roleId');
      const roleJoin = hasUserRolesTable
        ? `LEFT JOIN "user_roles" ur ON ur."userId" = u."id"`
        : '';

      await queryRunner.query(`
        INSERT INTO "staff_profiles" ("identityId", "organizationId", "roleId", "staffId", "position", "phoneNumber", "externalId", "status", "createdAt", "updatedAt")
        SELECT DISTINCT ON (i."id")
          i."id",
          ${u('organizationId')},
          ${roleExpr},
          ${u('staffId')},
          ${u('position')},
          ${u('phoneNumber')},
          ${u('externalId')},
          'ACTIVE',
          COALESCE(${u('createdAt')}, NOW()),
          COALESCE(${u('updatedAt')}, NOW())
        FROM "${legacyUserTable}" u
        JOIN "identities" i ON lower(trim(u."email")) = i."email"
        ${roleJoin}
        WHERE ${u('organizationId')} IS NOT NULL AND ${roleExpr} IS NOT NULL
        ORDER BY i."id"
        ON CONFLICT ("identityId") DO NOTHING;
      `);
    }

    const legacyEndUsersTable = await this.firstExistingTable(queryRunner, ['end_users', 'end_user']);
    if (legacyEndUsersTable) {
      const eu = await this.columnResolver(queryRunner, legacyEndUsersTable, 'eu');

      await queryRunner.query(`
        INSERT INTO "identities" ("id", "email", "name", "honorific", "avatarKey", "avatarUpdatedAt", "passwordHash", "status", "emailVerifiedAt", "failedLoginCount", "lockedUntil", "sessionsRevokedAt", "createdAt", "updatedAt")
        SELECT DISTINCT ON (lower(trim(eu."email")))
          eu."id",
          lower(trim(eu."email")),
          COALESCE(${eu('name', 'NULL')}, lower(trim(eu."email"))),
          ${eu('honorific')},
          ${eu('avatarKey')},
          ${eu('avatarUpdatedAt')},
          COALESCE(${eu('passwordHash')}, ''),
          COALESCE(${eu('status')}::text, 'ACTIVE'),
          ${eu('emailVerifiedAt')},
          COALESCE(${eu('failedLoginCount')}, 0),
          ${eu('lockedUntil')},
          ${eu('sessionsRevokedAt')},
          COALESCE(${eu('createdAt')}, NOW()),
          COALESCE(${eu('updatedAt')}, NOW())
        FROM "${legacyEndUsersTable}" eu
        WHERE eu."email" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "identities" x WHERE x."id" = eu."id" AND x."email" <> lower(trim(eu."email")))
        ORDER BY lower(trim(eu."email")), ${eu('createdAt', 'NOW()')} ASC
        ON CONFLICT ("email") DO UPDATE SET
          "emailVerifiedAt" = COALESCE("identities"."emailVerifiedAt", EXCLUDED."emailVerifiedAt"),
          "sessionsRevokedAt" = COALESCE("identities"."sessionsRevokedAt", EXCLUDED."sessionsRevokedAt");
      `);

      await queryRunner.query(`
        INSERT INTO "consumer_profiles" ("identityId", "phoneNumber", "deletionRequestedAt", "purgeAfter", "createdAt", "updatedAt")
        SELECT DISTINCT ON (i."id")
          i."id",
          ${eu('phoneNumber')},
          ${eu('deletionRequestedAt')},
          ${eu('purgeAfter')},
          COALESCE(${eu('createdAt')}, NOW()),
          COALESCE(${eu('updatedAt')}, NOW())
        FROM "${legacyEndUsersTable}" eu
        JOIN "identities" i ON lower(trim(eu."email")) = i."email"
        ORDER BY i."id"
        ON CONFLICT ("identityId") DO NOTHING;
      `);
    }
  }

  private async firstExistingTable(
    queryRunner: QueryRunner,
    candidates: string[],
  ): Promise<string | null> {
    for (const table of candidates) {
      if (await queryRunner.hasTable(table)) return table;
    }
    return null;
  }

  /**
   * Returns a function that renders `alias."column"` when the column exists on
   * the legacy table, or the given fallback SQL (default NULL) when it does not.
   */
  private async columnResolver(
    queryRunner: QueryRunner,
    table: string,
    alias: string,
  ): Promise<(column: string, fallback?: string) => string> {
    const rows: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1`,
      [table],
    );
    const columns = new Set(rows.map((r) => r.column_name));
    return (column: string, fallback = 'NULL') =>
      columns.has(column) ? `${alias}."${column}"` : fallback;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "consumer_profiles" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_profiles" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identities" CASCADE;`);
    await queryRunner.query(`ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "targetAudience";`);
  }
}
