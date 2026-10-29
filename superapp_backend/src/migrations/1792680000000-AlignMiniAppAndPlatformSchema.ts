import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignMiniAppAndPlatformSchema1792680000000 implements MigrationInterface {
  name = 'AlignMiniAppAndPlatformSchema1792680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Align "mini_apps" table with MiniApp entity
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "tagline" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "organizationId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "sharingScope" character varying NOT NULL DEFAULT 'GLOBAL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "lifecycleStatus" character varying NOT NULL DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "availabilityStatus" character varying NOT NULL DEFAULT 'TESTING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "alertTelegramChatId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "capabilities" jsonb DEFAULT '[]'`,
    );

    // Backfill legacy column data in "mini_apps"
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mini_apps' AND column_name = 'shortDescription') THEN
          UPDATE "mini_apps" SET "tagline" = "shortDescription" WHERE "tagline" IS NULL AND "shortDescription" IS NOT NULL;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mini_apps' AND column_name = 'fullDescription') THEN
          UPDATE "mini_apps" SET "description" = "fullDescription" WHERE "description" IS NULL AND "fullDescription" IS NOT NULL;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mini_apps' AND column_name = 'status') THEN
          UPDATE "mini_apps" SET "lifecycleStatus" = "status" WHERE ("lifecycleStatus" IS NULL OR "lifecycleStatus" = 'DRAFT') AND "status" IS NOT NULL;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mini_apps' AND column_name = 'teamTelegramChatId') THEN
          UPDATE "mini_apps" SET "alertTelegramChatId" = "teamTelegramChatId" WHERE "alertTelegramChatId" IS NULL AND "teamTelegramChatId" IS NOT NULL;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mini_apps' AND column_name = 'permissions') THEN
          UPDATE "mini_apps" SET "capabilities" = "permissions" WHERE ("capabilities" IS NULL OR "capabilities"::text = '[]') AND "permissions" IS NOT NULL;
        END IF;
      END $$;
    `);

    // Backfill organizationId with matched organization or default root FSA/FTC organization
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mini_apps' AND column_name = 'organizationCode') THEN
          UPDATE "mini_apps" m
          SET "organizationId" = o."id"
          FROM "organizations" o
          WHERE m."organizationId" IS NULL
            AND m."organizationCode" IS NOT NULL
            AND LOWER(m."organizationCode") = LOWER(o."code");
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mini_apps' AND column_name = 'organization') THEN
          UPDATE "mini_apps" m
          SET "organizationId" = o."id"
          FROM "organizations" o
          WHERE m."organizationId" IS NULL
            AND m."organization" IS NOT NULL
            AND LOWER(m."organization") = LOWER(o."name");
        END IF;

        UPDATE "mini_apps" m
        SET "organizationId" = (
          SELECT o.id FROM "organizations" o
          ORDER BY CASE WHEN o.code IN ('FTC', 'FSA') THEN 0 ELSE 1 END, o."createdAt" ASC
          LIMIT 1
        )
        WHERE m."organizationId" IS NULL;
      END $$;
    `);

    // Add safe FK and index for mini_apps.organizationId
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_mini_apps_organizationId') THEN
          ALTER TABLE "mini_apps"
          ADD CONSTRAINT "FK_mini_apps_organizationId"
          FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mini_apps_organizationId" ON "mini_apps" ("organizationId")`,
    );

    // 2. Align "audit_logs" table with AuditLog entity
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actorName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actorEmail" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actorRole" character varying`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        UPDATE "audit_logs" a
        SET "actorName" = u."name",
            "actorEmail" = u."email"
        FROM "user" u
        WHERE a."actorName" IS NULL
          AND a."actorId" IS NOT NULL
          AND a."actorId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND a."actorId"::uuid = u."id";
      END $$;
    `);

    // 3. Create "capability_definitions" table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "capability_definitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "category" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "isDeprecated" boolean NOT NULL DEFAULT false,
        "introducedInVersion" character varying,
        "deprecatedInVersion" character varying,
        "minSuperAppVersion" character varying,
        "maxSuperAppVersion" character varying,
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_capability_definitions_key" UNIQUE ("key"),
        CONSTRAINT "PK_capability_definitions_id" PRIMARY KEY ("id")
      )
    `);

    // 4. Create "capability_proposals" table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "capability_proposals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "capabilityKey" character varying NOT NULL,
        "capabilityName" character varying,
        "description" text,
        "miniAppId" uuid,
        "requestedById" uuid,
        "status" character varying NOT NULL DEFAULT 'PENDING_REVIEW',
        "adminDecisionReason" text,
        "targetSuperAppVersion" character varying,
        "implementedInSuperAppVersion" character varying,
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_capability_proposals_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_capability_proposals_miniAppId') THEN
          ALTER TABLE "capability_proposals"
          ADD CONSTRAINT "FK_capability_proposals_miniAppId"
          FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id")
          ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_capability_proposals_requestedById') THEN
          ALTER TABLE "capability_proposals"
          ADD CONSTRAINT "FK_capability_proposals_requestedById"
          FOREIGN KEY ("requestedById") REFERENCES "user"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_capability_proposals_miniAppId" ON "capability_proposals" ("miniAppId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_capability_proposals_requestedById" ON "capability_proposals" ("requestedById")`,
    );

    // 5. Create "mini_app_collaborators" table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mini_app_collaborators" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "miniAppId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" character varying NOT NULL DEFAULT 'DEVELOPER',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mini_app_collaborators_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_mini_app_collaborators_miniAppId_userId') THEN
          ALTER TABLE "mini_app_collaborators"
          ADD CONSTRAINT "UQ_mini_app_collaborators_miniAppId_userId"
          UNIQUE ("miniAppId", "userId");
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_mini_app_collaborators_miniAppId') THEN
          ALTER TABLE "mini_app_collaborators"
          ADD CONSTRAINT "FK_mini_app_collaborators_miniAppId"
          FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id")
          ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_mini_app_collaborators_userId') THEN
          ALTER TABLE "mini_app_collaborators"
          ADD CONSTRAINT "FK_mini_app_collaborators_userId"
          FOREIGN KEY ("userId") REFERENCES "user"("id")
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mini_app_collaborators_miniAppId" ON "mini_app_collaborators" ("miniAppId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mini_app_collaborators_userId" ON "mini_app_collaborators" ("userId")`,
    );

    // 6. Make notification.miniAppId nullable if not already
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'notification' AND column_name = 'miniAppId' AND is_nullable = 'NO'
        ) THEN
          ALTER TABLE "notification" ALTER COLUMN "miniAppId" DROP NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 5. Drop mini_app_collaborators
    await queryRunner.query(`DROP TABLE IF EXISTS "mini_app_collaborators"`);

    // 4. Drop capability_proposals
    await queryRunner.query(`DROP TABLE IF EXISTS "capability_proposals"`);

    // 3. Drop capability_definitions
    await queryRunner.query(`DROP TABLE IF EXISTS "capability_definitions"`);

    // 2. Drop audit_logs columns
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "actorRole"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "actorEmail"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "actorName"`,
    );

    // 1. Drop mini_apps additions
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP CONSTRAINT IF EXISTS "FK_mini_apps_organizationId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_mini_apps_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "capabilities"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "alertTelegramChatId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "availabilityStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "lifecycleStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "sharingScope"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "tagline"`,
    );
  }
}
