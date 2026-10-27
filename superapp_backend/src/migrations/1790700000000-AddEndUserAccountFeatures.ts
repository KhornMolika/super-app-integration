import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Account features for mobile end users: work profile, avatar, session
 * revocation (incl. refresh-token family start time) and deletion grace period.
 * Constraint/index names match the entities so `synchronize: true` keeps them.
 */
export class AddEndUserAccountFeatures1790700000000 implements MigrationInterface {
  name = 'AddEndUserAccountFeatures1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "end_users"
        ADD COLUMN IF NOT EXISTS "honorific" character varying,
        ADD COLUMN IF NOT EXISTS "position" character varying(100),
        ADD COLUMN IF NOT EXISTS "organizationUnit" character varying(150),
        ADD COLUMN IF NOT EXISTS "staffId" character varying(32),
        ADD COLUMN IF NOT EXISTS "avatarKey" character varying,
        ADD COLUMN IF NOT EXISTS "avatarUpdatedAt" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "sessionsRevokedAt" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "deletionRequestedAt" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "purgeAfter" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(
      `ALTER TABLE "end_user_refresh_tokens" ADD COLUMN IF NOT EXISTS "familyStartedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "end_user_refresh_tokens" DROP COLUMN IF EXISTS "familyStartedAt"`,
    );
    await queryRunner.query(`
      ALTER TABLE "end_users"
        DROP COLUMN IF EXISTS "purgeAfter",
        DROP COLUMN IF EXISTS "deletionRequestedAt",
        DROP COLUMN IF EXISTS "sessionsRevokedAt",
        DROP COLUMN IF EXISTS "avatarUpdatedAt",
        DROP COLUMN IF EXISTS "avatarKey",
        DROP COLUMN IF EXISTS "staffId",
        DROP COLUMN IF EXISTS "organizationUnit",
        DROP COLUMN IF EXISTS "position",
        DROP COLUMN IF EXISTS "honorific"
    `);
  }
}
