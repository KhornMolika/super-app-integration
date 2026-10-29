import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitMiniAppGodEntity1792610000000 implements MigrationInterface {
  name = 'SplitMiniAppGodEntity1792610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create miniapp_versions table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "miniapp_versions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "miniAppId" uuid NOT NULL,
                "version" character varying NOT NULL,
                "type" character varying NOT NULL DEFAULT 'PRODUCTION',
                "status" character varying NOT NULL DEFAULT 'DRAFT',
                "gitRef" character varying,
                "packageName" character varying,
                "sourceType" character varying,
                "saVersion" character varying,
                "changelog" text,
                "artifactUrl" text,
                "apkSize" character varying,
                "checksum" character varying,
                "releasedAt" TIMESTAMP WITH TIME ZONE,
                "releasedBy" character varying,
                "buildNumber" integer,
                "jenkinsJobUrl" character varying,
                "integrationConfig" jsonb,
                "permissions" jsonb DEFAULT '[]',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_miniapp_versions_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_miniapp_versions_miniAppId" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE CASCADE
            )
        `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_miniapp_versions_miniAppId" ON "miniapp_versions" ("miniAppId")`,
    );

    // 2. Create miniapp_builds table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "miniapp_builds" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "miniAppId" uuid NOT NULL,
                "version" character varying,
                "buildStatus" character varying NOT NULL DEFAULT 'IDLE',
                "validationStatus" character varying NOT NULL DEFAULT 'PENDING',
                "validationStages" jsonb DEFAULT '{}',
                "validationReport" jsonb,
                "validationErrors" jsonb,
                "buildStages" jsonb DEFAULT '{}',
                "buildError" text,
                "jenkinsJobUrl" character varying,
                "actorId" character varying,
                "startedAt" TIMESTAMP WITH TIME ZONE,
                "completedAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_miniapp_builds_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_miniapp_builds_miniAppId" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE CASCADE
            )
        `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_miniapp_builds_miniAppId" ON "miniapp_builds" ("miniAppId")`,
    );

    // 3. Create miniapp_legal table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "miniapp_legal" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "miniAppId" uuid NOT NULL,
                "termsUrl" character varying,
                "termsDescription" text,
                "privacyPolicyUrl" character varying,
                "privacyPolicyDescription" text,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_miniapp_legal_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_miniapp_legal_miniAppId" UNIQUE ("miniAppId"),
                CONSTRAINT "FK_miniapp_legal_miniAppId" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE CASCADE
            )
        `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_miniapp_legal_miniAppId" ON "miniapp_legal" ("miniAppId")`,
    );

    // 4. Data Migration: Copy legal compliance records into miniapp_legal
    await queryRunner.query(`
            INSERT INTO "miniapp_legal" ("id", "miniAppId", "termsUrl", "termsDescription", "privacyPolicyUrl", "privacyPolicyDescription", "createdAt", "updatedAt")
            SELECT 
                uuid_generate_v4(),
                m."id",
                m."termsUrl",
                m."termsDescription",
                m."privacyPolicyUrl",
                m."privacyPolicyDescription",
                now(),
                now()
            FROM "mini_apps" m
            WHERE NOT EXISTS (SELECT 1 FROM "miniapp_legal" l WHERE l."miniAppId" = m."id")
              AND (m."termsUrl" IS NOT NULL OR m."privacyPolicyUrl" IS NOT NULL OR m."termsDescription" IS NOT NULL OR m."privacyPolicyDescription" IS NOT NULL)
        `);

    // 5. Data Migration: Unpack versionHistory JSON array elements into miniapp_versions
    await queryRunner.query(`
            INSERT INTO "miniapp_versions" (
                "id",
                "miniAppId",
                "version",
                "gitRef",
                "packageName",
                "sourceType",
                "saVersion",
                "type",
                "status",
                "changelog",
                "artifactUrl",
                "apkSize",
                "checksum",
                "releasedAt",
                "releasedBy",
                "buildNumber",
                "jenkinsJobUrl",
                "integrationConfig",
                "permissions",
                "createdAt",
                "updatedAt"
            )
            SELECT 
                uuid_generate_v4(),
                m."id",
                COALESCE(elem->>'version', m."version", '1.0.0'),
                elem->>'gitRef',
                elem->>'packageName',
                elem->>'sourceType',
                elem->>'saVersion',
                COALESCE(elem->>'type', 'PRODUCTION'),
                COALESCE(elem->>'status', 'ACTIVE'),
                elem->>'changelog',
                elem->>'artifactUrl',
                elem->>'apkSize',
                elem->>'checksum',
                CASE 
                    WHEN elem->>'releasedAt' IS NOT NULL AND elem->>'releasedAt' <> '' 
                    THEN (elem->>'releasedAt')::timestamptz 
                    ELSE now() 
                END,
                elem->>'releasedBy',
                CASE 
                    WHEN elem->>'buildNumber' IS NOT NULL AND elem->>'buildNumber' ~ '^[0-9]+$' 
                    THEN (elem->>'buildNumber')::integer 
                    ELSE NULL 
                END,
                elem->>'jenkinsJobUrl',
                CASE 
                    WHEN jsonb_typeof(elem->'integrationConfig') = 'object' 
                    THEN elem->'integrationConfig' 
                    ELSE NULL 
                END,
                CASE 
                    WHEN jsonb_typeof(elem->'permissions') = 'array' 
                    THEN elem->'permissions' 
                    ELSE '[]'::jsonb 
                END,
                now(),
                now()
            FROM "mini_apps" m,
            LATERAL jsonb_array_elements(
                CASE 
                    WHEN m."versionHistory" IS NOT NULL AND jsonb_typeof(m."versionHistory") = 'array' AND jsonb_array_length(m."versionHistory") > 0 
                    THEN m."versionHistory" 
                    ELSE jsonb_build_array(jsonb_build_object('version', COALESCE(m."version", '1.0.0'), 'status', 'ACTIVE', 'type', 'PRODUCTION'))
                END
            ) AS elem
            WHERE NOT EXISTS (SELECT 1 FROM "miniapp_versions" v WHERE v."miniAppId" = m."id")
        `);

    // 6. Data Migration: Copy initial build state into miniapp_builds
    await queryRunner.query(`
            INSERT INTO "miniapp_builds" (
                "id",
                "miniAppId",
                "version",
                "buildStatus",
                "validationStatus",
                "validationStages",
                "validationReport",
                "validationErrors",
                "buildStages",
                "buildError",
                "jenkinsJobUrl",
                "startedAt",
                "completedAt",
                "createdAt",
                "updatedAt"
            )
            SELECT 
                uuid_generate_v4(),
                m."id",
                COALESCE(m."activeTestVersion", m."version", '1.0.0'),
                COALESCE(m."buildStatus", 'IDLE'),
                COALESCE(m."validationStatus", 'PENDING'),
                m."validationStages",
                m."validationReport",
                m."validationErrors",
                m."buildStages",
                m."buildError",
                NULL,
                now(),
                now(),
                now(),
                now()
            FROM "mini_apps" m
            WHERE NOT EXISTS (SELECT 1 FROM "miniapp_builds" b WHERE b."miniAppId" = m."id")
        `);

    // 7. Drop extracted columns from mini_apps
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "termsUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "termsDescription"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "privacyPolicyUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "privacyPolicyDescription"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "termsUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "termsDescription" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "privacyPolicyUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "privacyPolicyDescription" text`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "miniapp_legal"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "miniapp_builds"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "miniapp_versions"`);
  }
}
