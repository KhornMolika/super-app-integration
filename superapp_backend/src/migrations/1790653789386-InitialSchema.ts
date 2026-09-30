import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1790653789386 implements MigrationInterface {
    name = 'InitialSchema1790653789386'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actorId" character varying, "action" character varying NOT NULL, "resourceType" character varying NOT NULL, "resourceId" character varying, "oldValue" jsonb, "newValue" jsonb, "metadata" jsonb, "ipAddress" character varying, "userAgent" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "permission" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "resource" character varying, "action" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_240853a0c3353c25fb12434ad33" UNIQUE ("name"), CONSTRAINT "PK_3b8b97af9d9d8807e41e6f48362" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "role" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ae4578dcaed5adff96595e61660" UNIQUE ("name"), CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "metadata" jsonb, "userId" uuid, "miniAppId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "avatarUrl" character varying, "externalId" character varying, "isActive" boolean NOT NULL DEFAULT true, "telegramChatId" character varying, "telegramUsername" character varying, "telegramConnectedAt" TIMESTAMP, "teamTelegramChatId" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_bc97b425592aa51df5da7a440a6" UNIQUE ("externalId"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "mini_app_issue" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "severity" character varying NOT NULL DEFAULT 'HIGH', "description" text NOT NULL, "status" character varying NOT NULL DEFAULT 'OPEN', "classification" character varying NOT NULL DEFAULT 'MINI_APP_ISSUE', "metadata" jsonb, "miniAppId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1db3533249fa16544650917e711" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "mini_apps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "appId" character varying NOT NULL, "name" character varying NOT NULL, "shortDescription" text, "fullDescription" text, "logo" text, "category" character varying, "organization" character varying, "organizationCode" character varying, "status" character varying NOT NULL DEFAULT 'DRAFT', "termsUrl" character varying, "termsDescription" text, "privacyPolicyUrl" character varying, "privacyPolicyDescription" text, "ownerName" character varying, "ownerEmail" character varying, "ownerId" uuid, "supportEmail" character varying, "teamTelegramChatId" character varying, "teamName" character varying, "integrationMethod" character varying, "integrationConfig" jsonb, "validationErrors" jsonb, "validationStages" jsonb DEFAULT '{}', "validationReport" jsonb, "validationStatus" character varying NOT NULL DEFAULT 'PENDING', "buildStages" jsonb DEFAULT '{}', "buildStatus" character varying DEFAULT 'IDLE', "buildError" text, "verificationToken" character varying, "isDomainVerified" boolean NOT NULL DEFAULT false, "domainVerifiedAt" TIMESTAMP, "permissions" jsonb DEFAULT '[]', "securityChecks" jsonb DEFAULT '[]', "pendingRevision" jsonb, "version" character varying DEFAULT '1.0.0', "currentReleaseVersion" character varying, "activeTestVersion" character varying, "draftVersion" character varying, "versionHistory" jsonb DEFAULT '[]', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8a6acbf1291d91b8969d6c9f4f8" UNIQUE ("appId"), CONSTRAINT "PK_b35d202eb2511d471bc3ac68510" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "miniapp_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "miniAppId" uuid NOT NULL, "actorId" character varying, "type" character varying NOT NULL, "title" character varying NOT NULL, "description" text, "metadata" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7597224db6aee02f5d125489c54" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "system_settings" ("key" character varying NOT NULL, "value" jsonb NOT NULL, "description" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b1b5bc664526d375c94ce9ad43d" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "end_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "passwordHash" character varying NOT NULL, "emailVerifiedAt" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL DEFAULT 'ACTIVE', "failedLoginCount" integer NOT NULL DEFAULT '0', "lockedUntil" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_end_users_email" UNIQUE ("email"), CONSTRAINT "CHK_end_users_email_lowercase" CHECK ("email" = lower("email")), CONSTRAINT "PK_end_users_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "end_user_email_verification_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "failedAttempts" integer NOT NULL DEFAULT '0', "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_end_user_email_verification_tokens_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_end_user_evt_userId" ON "end_user_email_verification_tokens"  ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_end_user_evt_tokenHash" ON "end_user_email_verification_tokens"  ("tokenHash") `);
        await queryRunner.query(`CREATE TYPE "public"."organizations_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'PENDING')`);
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying, "domain" character varying NOT NULL, "description" text, "status" "public"."organizations_status_enum" NOT NULL DEFAULT 'ACTIVE', "contactEmail" character varying, "contactPhone" character varying, "metadata" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9b7ca6d30b94fef571cff876884" UNIQUE ("name"), CONSTRAINT "UQ_98678ed828cc71e4f8a58c95d6b" UNIQUE ("domain"), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "end_user_refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "familyId" uuid NOT NULL, "tokenHash" character varying NOT NULL, "userId" uuid NOT NULL, "userAgent" character varying, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "rotatedAt" TIMESTAMP WITH TIME ZONE, "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_end_user_refresh_tokens_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_end_user_rt_familyId" ON "end_user_refresh_tokens"  ("familyId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_end_user_rt_tokenHash" ON "end_user_refresh_tokens"  ("tokenHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_end_user_rt_userId" ON "end_user_refresh_tokens"  ("userId") `);
        await queryRunner.query(`CREATE TABLE "permission_proposals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "permissionKey" character varying NOT NULL, "permissionName" character varying, "description" text, "status" character varying NOT NULL DEFAULT 'PENDING_REVIEW', "adminDecisionReason" text, "targetSuperAppVersion" character varying, "implementedInSuperAppVersion" character varying, "metadata" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "miniAppId" uuid, "requestedById" uuid, CONSTRAINT "PK_7d29e253da9493d16a10ea9c49e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "permission_definitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "name" character varying NOT NULL, "description" text, "category" character varying, "isActive" boolean NOT NULL DEFAULT true, "isDeprecated" boolean NOT NULL DEFAULT false, "introducedInVersion" character varying, "deprecatedInVersion" character varying, "minSuperAppVersion" character varying, "maxSuperAppVersion" character varying, "metadata" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2bbeb499ae466946dda78789407" UNIQUE ("key"), CONSTRAINT "PK_6ef7d38f8b4cc866ba89f223529" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "superapp_capabilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "superAppVersion" character varying NOT NULL, "platform" character varying NOT NULL DEFAULT 'android', "capabilities" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_adc31c1e97a2b8d4357185f5e83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("roleId" uuid NOT NULL, "permissionId" uuid NOT NULL, CONSTRAINT "PK_d430a02aad006d8a70f3acd7d03" PRIMARY KEY ("roleId", "permissionId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b4599f8b8f548d35850afa2d12" ON "role_permissions"  ("roleId") `);
        await queryRunner.query(`CREATE INDEX "IDX_06792d0c62ce6b0203c03643cd" ON "role_permissions"  ("permissionId") `);
        await queryRunner.query(`CREATE TABLE "user_roles" ("userId" uuid NOT NULL, "roleId" uuid NOT NULL, CONSTRAINT "PK_88481b0c4ed9ada47e9fdd67475" PRIMARY KEY ("userId", "roleId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_472b25323af01488f1f66a06b6" ON "user_roles"  ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_86033897c009fcca8b6505d6be" ON "user_roles"  ("roleId") `);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_1ced25315eb974b73391fb1c81b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_bc02f8f93af1ba68ebbe0c74bb6" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mini_app_issue" ADD CONSTRAINT "FK_324a4b42949b1e767675d38a803" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mini_apps" ADD CONSTRAINT "FK_9eedefb930e4503d9c874302a6e" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "miniapp_activities" ADD CONSTRAINT "FK_5ec9674c5a35ed53aee2118372c" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "end_user_email_verification_tokens" ADD CONSTRAINT "FK_end_user_evt_userId" FOREIGN KEY ("userId") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "end_user_refresh_tokens" ADD CONSTRAINT "FK_end_user_rt_userId" FOREIGN KEY ("userId") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "permission_proposals" ADD CONSTRAINT "FK_5029f43de31cb24e38db3593e84" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "permission_proposals" ADD CONSTRAINT "FK_ef551a4d928d7803b1a4da20c34" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_06792d0c62ce6b0203c03643cdd" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_472b25323af01488f1f66a06b67" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_86033897c009fcca8b6505d6be2" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_86033897c009fcca8b6505d6be2"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_472b25323af01488f1f66a06b67"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_06792d0c62ce6b0203c03643cdd"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c"`);
        await queryRunner.query(`ALTER TABLE "permission_proposals" DROP CONSTRAINT "FK_ef551a4d928d7803b1a4da20c34"`);
        await queryRunner.query(`ALTER TABLE "permission_proposals" DROP CONSTRAINT "FK_5029f43de31cb24e38db3593e84"`);
        await queryRunner.query(`ALTER TABLE "end_user_refresh_tokens" DROP CONSTRAINT "FK_end_user_rt_userId"`);
        await queryRunner.query(`ALTER TABLE "end_user_email_verification_tokens" DROP CONSTRAINT "FK_end_user_evt_userId"`);
        await queryRunner.query(`ALTER TABLE "miniapp_activities" DROP CONSTRAINT "FK_5ec9674c5a35ed53aee2118372c"`);
        await queryRunner.query(`ALTER TABLE "mini_apps" DROP CONSTRAINT "FK_9eedefb930e4503d9c874302a6e"`);
        await queryRunner.query(`ALTER TABLE "mini_app_issue" DROP CONSTRAINT "FK_324a4b42949b1e767675d38a803"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_bc02f8f93af1ba68ebbe0c74bb6"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_1ced25315eb974b73391fb1c81b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_86033897c009fcca8b6505d6be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_472b25323af01488f1f66a06b6"`);
        await queryRunner.query(`DROP TABLE "user_roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_06792d0c62ce6b0203c03643cd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b4599f8b8f548d35850afa2d12"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TABLE "superapp_capabilities"`);
        await queryRunner.query(`DROP TABLE "permission_definitions"`);
        await queryRunner.query(`DROP TABLE "permission_proposals"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_end_user_rt_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_end_user_rt_tokenHash"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_end_user_rt_familyId"`);
        await queryRunner.query(`DROP TABLE "end_user_refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
        await queryRunner.query(`DROP TYPE "public"."organizations_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_end_user_evt_tokenHash"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_end_user_evt_userId"`);
        await queryRunner.query(`DROP TABLE "end_user_email_verification_tokens"`);
        await queryRunner.query(`DROP TABLE "end_users"`);
        await queryRunner.query(`DROP TABLE "system_settings"`);
        await queryRunner.query(`DROP TABLE "miniapp_activities"`);
        await queryRunner.query(`DROP TABLE "mini_apps"`);
        await queryRunner.query(`DROP TABLE "mini_app_issue"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "notification"`);
        await queryRunner.query(`DROP TABLE "role"`);
        await queryRunner.query(`DROP TABLE "permission"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
    }

}
