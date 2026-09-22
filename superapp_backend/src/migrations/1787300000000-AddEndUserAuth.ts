import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * UPGRADE NOTE: this migration is written for a fresh install. If the three
 * tables (end_users, end_user_email_verification_tokens, end_user_refresh_tokens)
 * already exist from earlier, unreleased code, DROP them before booting. With
 * `synchronize: true` TypeORM would otherwise DROP/ADD the columns whose type
 * changed (timestamp -> timestamptz) and can fail to boot. Alternative: run the
 * manual `ALTER TABLE ... ALTER COLUMN ... TYPE timestamptz USING ... AT TIME
 * ZONE 'UTC'` plus `ADD CONSTRAINT` (CHECK, FKs, failedAttempts) steps by hand.
 */
export class AddEndUserAuth1787300000000 implements MigrationInterface {
  name = 'AddEndUserAuth1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "end_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "emailVerifiedAt" TIMESTAMP WITH TIME ZONE,
        "status" character varying NOT NULL DEFAULT 'ACTIVE',
        "failedLoginCount" integer NOT NULL DEFAULT 0,
        "lockedUntil" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_end_users_email" UNIQUE ("email"),
        CONSTRAINT "CHK_end_users_email_lowercase" CHECK ("email" = lower("email")),
        CONSTRAINT "PK_end_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "end_user_email_verification_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tokenHash" character varying NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "failedAttempts" integer NOT NULL DEFAULT 0,
        "usedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_end_user_email_verification_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_end_user_evt_userId" FOREIGN KEY ("userId") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_end_user_evt_userId" ON "end_user_email_verification_tokens" ("userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_end_user_evt_tokenHash" ON "end_user_email_verification_tokens" ("tokenHash")`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "end_user_refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "familyId" uuid NOT NULL,
        "tokenHash" character varying NOT NULL,
        "userId" uuid NOT NULL,
        "userAgent" character varying,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "rotatedAt" TIMESTAMP WITH TIME ZONE,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_end_user_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_end_user_rt_userId" FOREIGN KEY ("userId") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_end_user_rt_familyId" ON "end_user_refresh_tokens" ("familyId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_end_user_rt_userId" ON "end_user_refresh_tokens" ("userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_end_user_rt_tokenHash" ON "end_user_refresh_tokens" ("tokenHash")`,
    );
  }

  // down() deliberately does NOT drop the uuid-ossp extension (shared).
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "end_user_refresh_tokens"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "end_user_email_verification_tokens"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "end_users"`);
  }
}
