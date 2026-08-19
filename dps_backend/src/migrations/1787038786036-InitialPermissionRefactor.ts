import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialPermissionRefactor1787038786036 implements MigrationInterface {
    name = 'InitialPermissionRefactor1787038786036'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Rename mini_app to mini_apps
        await queryRunner.query(`ALTER TABLE IF EXISTS "mini_app" RENAME TO "mini_apps"`);
        // Rename constraints related to mini_app
        await queryRunner.query(`ALTER TABLE "mini_app_issue" DROP CONSTRAINT IF EXISTS "FK_324a4b42949b1e767675d38a803"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_bc02f8f93af1ba68ebbe0c74bb6"`);

        // 2. Create permission_definitions
        await queryRunner.query(`CREATE TABLE "permission_definitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "name" character varying NOT NULL, "description" text, "category" character varying, "isActive" boolean NOT NULL DEFAULT true, "isDeprecated" boolean NOT NULL DEFAULT false, "introducedInVersion" character varying, "deprecatedInVersion" character varying, "minSuperAppVersion" character varying, "maxSuperAppVersion" character varying, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2bbeb499ae466946dda78789407" UNIQUE ("key"), CONSTRAINT "PK_6ef7d38f8b4cc866ba89f223529" PRIMARY KEY ("id"))`);

        // Seed initial permissions
        await queryRunner.query(`INSERT INTO "permission_definitions" ("key", "name", "category") VALUES ('camera', 'Camera', 'DEVICE'), ('location', 'Location', 'DEVICE'), ('storage', 'Storage', 'DEVICE'), ('microphone', 'Microphone', 'DEVICE') ON CONFLICT DO NOTHING`);

        // 3. Migrate mini_app_permission to mini_app_permission_requests
        await queryRunner.query(`ALTER TABLE IF EXISTS "mini_app_permission" RENAME TO "mini_app_permission_requests"`);
        
        // Add new columns
        await queryRunner.query(`ALTER TABLE "mini_app_permission_requests" ADD COLUMN IF NOT EXISTS "permissionId" uuid`);
        await queryRunner.query(`ALTER TABLE "mini_app_permission_requests" ADD COLUMN IF NOT EXISTS "requestedVersion" character varying`);
        await queryRunner.query(`ALTER TABLE "mini_app_permission_requests" ADD COLUMN IF NOT EXISTS "required" boolean NOT NULL DEFAULT false`);
        
        // Migrate data by matching type to permission key
        await queryRunner.query(`
            UPDATE "mini_app_permission_requests" req
            SET "permissionId" = def.id
            FROM "permission_definitions" def
            WHERE req.type = def.key
        `);

        // Drop old 'type' column
        await queryRunner.query(`ALTER TABLE "mini_app_permission_requests" DROP COLUMN IF EXISTS "type"`);

        // 4. Create new tables
        await queryRunner.query(`CREATE TABLE "permission_proposals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "permissionKey" character varying NOT NULL, "permissionName" character varying, "description" text, "status" character varying NOT NULL DEFAULT 'PENDING_REVIEW', "adminDecisionReason" text, "targetSuperAppVersion" character varying, "implementedInSuperAppVersion" character varying, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "miniAppId" uuid, "requestedById" uuid, CONSTRAINT "PK_7d29e253da9493d16a10ea9c49e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "superapp_capabilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "superAppVersion" character varying NOT NULL, "platform" character varying NOT NULL DEFAULT 'android', "capabilities" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_adc31c1e97a2b8d4357185f5e83" PRIMARY KEY ("id"))`);

        // 5. Re-add foreign keys
        await queryRunner.query(`ALTER TABLE "mini_app_permission_requests" DROP CONSTRAINT IF EXISTS "FK_e0f166d1d8dae93d72227a8327a"`);
        await queryRunner.query(`ALTER TABLE "mini_app_permission_requests" ADD CONSTRAINT "FK_e0f166d1d8dae93d72227a8327a" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mini_app_permission_requests" ADD CONSTRAINT "FK_b28a8dfb41abf6c90a3d8eb718f" FOREIGN KEY ("permissionId") REFERENCES "permission_definitions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        
        await queryRunner.query(`ALTER TABLE "mini_app_issue" ADD CONSTRAINT "FK_324a4b42949b1e767675d38a803" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_bc02f8f93af1ba68ebbe0c74bb6" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        
        await queryRunner.query(`ALTER TABLE "permission_proposals" ADD CONSTRAINT "FK_5029f43de31cb24e38db3593e84" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "permission_proposals" ADD CONSTRAINT "FK_ef551a4d928d7803b1a4da20c34" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Simple rollback, just drop new tables and columns
        await queryRunner.query(`DROP TABLE "superapp_capabilities"`);
        await queryRunner.query(`DROP TABLE "permission_proposals"`);
        await queryRunner.query(`DROP TABLE "permission_definitions" CASCADE`);
        await queryRunner.query(`ALTER TABLE "mini_app_permission_requests" ADD COLUMN "type" character varying`);
        await queryRunner.query(`ALTER TABLE "mini_app_permission_requests" RENAME TO "mini_app_permission"`);
        await queryRunner.query(`ALTER TABLE "mini_apps" RENAME TO "mini_app"`);
    }

}
