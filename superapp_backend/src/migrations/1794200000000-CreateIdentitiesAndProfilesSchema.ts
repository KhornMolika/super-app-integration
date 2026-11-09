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

    // 5. Safe idempotent data migration from legacy `user` or `users`
    const hasUsersTable = await queryRunner.hasTable('users');
    const hasUserTable = await queryRunner.hasTable('user');
    const legacyUserTable = hasUsersTable ? 'users' : hasUserTable ? 'user' : null;

    if (legacyUserTable) {
      await queryRunner.query(`
        INSERT INTO "identities" ("id", "email", "name", "passwordHash", "status", "failedLoginCount", "lockedUntil", "createdAt", "updatedAt")
        SELECT 
          u."id",
          lower(trim(u."email")),
          u."name",
          COALESCE(u."passwordHash", ''),
          COALESCE(u."status", 'ACTIVE'),
          0,
          NULL,
          COALESCE(u."createdAt", NOW()),
          COALESCE(u."updatedAt", NOW())
        FROM "${legacyUserTable}" u
        ON CONFLICT ("email") DO NOTHING;
      `);

      const hasUserRolesTable = await queryRunner.hasTable('user_roles');
      if (hasUserRolesTable) {
        await queryRunner.query(`
          INSERT INTO "staff_profiles" ("identityId", "organizationId", "roleId", "staffId", "position", "phoneNumber", "externalId", "status", "createdAt", "updatedAt")
          SELECT 
            i."id",
            u."organizationId",
            COALESCE(u."roleId", ur."roleId"),
            u."staffId",
            u."position",
            u."phoneNumber",
            u."externalId",
            'ACTIVE',
            COALESCE(u."createdAt", NOW()),
            COALESCE(u."updatedAt", NOW())
          FROM "${legacyUserTable}" u
          JOIN "identities" i ON lower(trim(u."email")) = i."email"
          LEFT JOIN "user_roles" ur ON ur."userId" = u."id"
          WHERE u."organizationId" IS NOT NULL AND COALESCE(u."roleId", ur."roleId") IS NOT NULL
          ON CONFLICT ("identityId") DO NOTHING;
        `);
      } else {
        await queryRunner.query(`
          INSERT INTO "staff_profiles" ("identityId", "organizationId", "roleId", "staffId", "position", "phoneNumber", "externalId", "status", "createdAt", "updatedAt")
          SELECT 
            i."id",
            u."organizationId",
            u."roleId",
            u."staffId",
            u."position",
            u."phoneNumber",
            u."externalId",
            'ACTIVE',
            COALESCE(u."createdAt", NOW()),
            COALESCE(u."updatedAt", NOW())
          FROM "${legacyUserTable}" u
          JOIN "identities" i ON lower(trim(u."email")) = i."email"
          WHERE u."organizationId" IS NOT NULL AND u."roleId" IS NOT NULL
          ON CONFLICT ("identityId") DO NOTHING;
        `);
      }
    }

    // 6. Safe idempotent data migration from legacy `end_users` or `end_user`
    const hasEndUsersTable = await queryRunner.hasTable('end_users');
    const hasEndUserTable = await queryRunner.hasTable('end_user');
    const legacyEndUsersTable = hasEndUsersTable ? 'end_users' : hasEndUserTable ? 'end_user' : null;

    if (legacyEndUsersTable) {
      await queryRunner.query(`
        INSERT INTO "identities" ("id", "email", "name", "passwordHash", "status", "emailVerifiedAt", "failedLoginCount", "lockedUntil", "sessionsRevokedAt", "createdAt", "updatedAt")
        SELECT 
          eu."id",
          lower(trim(eu."email")),
          eu."name",
          eu."passwordHash",
          COALESCE(eu."status", 'ACTIVE'),
          eu."emailVerifiedAt",
          COALESCE(eu."failedLoginCount", 0),
          eu."lockedUntil",
          eu."sessionsRevokedAt",
          COALESCE(eu."createdAt", NOW()),
          COALESCE(eu."updatedAt", NOW())
        FROM "${legacyEndUsersTable}" eu
        ON CONFLICT ("email") DO UPDATE SET
          "emailVerifiedAt" = COALESCE("identities"."emailVerifiedAt", EXCLUDED."emailVerifiedAt"),
          "sessionsRevokedAt" = COALESCE("identities"."sessionsRevokedAt", EXCLUDED."sessionsRevokedAt");
      `);

      await queryRunner.query(`
        INSERT INTO "consumer_profiles" ("identityId", "phoneNumber", "deletionRequestedAt", "purgeAfter", "createdAt", "updatedAt")
        SELECT 
          i."id",
          eu."phoneNumber",
          eu."deletionRequestedAt",
          eu."purgeAfter",
          COALESCE(eu."createdAt", NOW()),
          COALESCE(eu."updatedAt", NOW())
        FROM "${legacyEndUsersTable}" eu
        JOIN "identities" i ON lower(trim(eu."email")) = i."email"
        ON CONFLICT ("identityId") DO NOTHING;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "consumer_profiles" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_profiles" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identities" CASCADE;`);
    await queryRunner.query(`ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "targetAudience";`);
  }
}
