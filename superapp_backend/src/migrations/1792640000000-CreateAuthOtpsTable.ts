import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthOtpsTable1792640000000 implements MigrationInterface {
  name = 'CreateAuthOtpsTable1792640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_otps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "code" character varying(6) NOT NULL,
        "purpose" character varying NOT NULL DEFAULT 'PASSWORD_RESET',
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "isUsed" boolean NOT NULL DEFAULT false,
        "usedAt" TIMESTAMP WITH TIME ZONE,
        "attempts" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_otps_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_auth_otps_email" ON "auth_otps" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_auth_otps_lookup" ON "auth_otps" ("email", "purpose", "isUsed")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_otps"`);
  }
}
