import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignAllEntitiesAndColumns1792690000000
  implements MigrationInterface
{
  name = 'AlignAllEntitiesAndColumns1792690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Align "miniapp_builds" table with MiniAppBuild entity
    await queryRunner.query(
      `ALTER TABLE "miniapp_builds" ADD COLUMN IF NOT EXISTS "versionId" uuid`,
    );

    await queryRunner.query(`
      UPDATE "miniapp_builds" b
      SET "versionId" = v."id"
      FROM "miniapp_versions" v
      WHERE b."versionId" IS NULL
        AND b."miniAppId" = v."miniAppId"
        AND b."version" = v."version";
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_miniapp_builds_versionId') THEN
          ALTER TABLE "miniapp_builds"
          ADD CONSTRAINT "FK_miniapp_builds_versionId"
          FOREIGN KEY ("versionId") REFERENCES "miniapp_versions"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_miniapp_builds_versionId" ON "miniapp_builds" ("versionId")`,
    );

    // 2. Align "end_user_refresh_tokens" table with RefreshToken entity
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'end_user_refresh_tokens' AND column_name = 'userId')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'end_user_refresh_tokens' AND column_name = 'endUserId') THEN
          ALTER TABLE "end_user_refresh_tokens" RENAME COLUMN "userId" TO "endUserId";
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'end_user_refresh_tokens' AND column_name = 'endUserId') THEN
          ALTER TABLE "end_user_refresh_tokens" ADD COLUMN "endUserId" uuid;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'end_user_refresh_tokens' AND column_name = 'familyStartedAt') THEN
          ALTER TABLE "end_user_refresh_tokens" ADD COLUMN "familyStartedAt" TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_end_user_rt_userId') THEN
          ALTER TABLE "end_user_refresh_tokens"
          ADD CONSTRAINT "FK_end_user_rt_userId"
          FOREIGN KEY ("endUserId") REFERENCES "end_users"("id")
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_end_user_rt_endUserId" ON "end_user_refresh_tokens" ("endUserId")`,
    );

    // 3. Backfill capability_definitions from legacy permission_definitions if present
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_definitions')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'capability_definitions') THEN
          INSERT INTO "capability_definitions" (
            "id", "key", "name", "description", "category",
            "isActive", "isDeprecated", "introducedInVersion",
            "deprecatedInVersion", "minSuperAppVersion",
            "maxSuperAppVersion", "metadata", "createdAt", "updatedAt"
          )
          SELECT 
            "id", "key", "name", "description", "category",
            "isActive", "isDeprecated", "introducedInVersion",
            "deprecatedInVersion", "minSuperAppVersion",
            "maxSuperAppVersion", "metadata", "createdAt", "updatedAt"
          FROM "permission_definitions"
          ON CONFLICT ("key") DO NOTHING;
        END IF;
      END $$;
    `);

    // 4. Backfill capability_proposals from legacy permission_proposals if present
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_proposals')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'capability_proposals') THEN
          INSERT INTO "capability_proposals" (
            "id", "capabilityKey", "capabilityName", "description",
            "status", "adminDecisionReason", "targetSuperAppVersion",
            "implementedInSuperAppVersion", "metadata", "createdAt", "updatedAt",
            "miniAppId", "requestedById"
          )
          SELECT 
            "id", "permissionKey", "permissionName", "description",
            "status", "adminDecisionReason", "targetSuperAppVersion",
            "implementedInSuperAppVersion", "metadata", "createdAt", "updatedAt",
            "miniAppId", "requestedById"
          FROM "permission_proposals"
          ON CONFLICT ("id") DO NOTHING;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_miniapp_builds_versionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "miniapp_builds" DROP CONSTRAINT IF EXISTS "FK_miniapp_builds_versionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "miniapp_builds" DROP COLUMN IF EXISTS "versionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "end_user_refresh_tokens" DROP COLUMN IF EXISTS "familyStartedAt"`,
    );
  }
}
