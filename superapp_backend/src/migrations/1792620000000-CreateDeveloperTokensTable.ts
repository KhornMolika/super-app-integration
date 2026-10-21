import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDeveloperTokensTable1792620000000 implements MigrationInterface {
    name = 'CreateDeveloperTokensTable1792620000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "developer_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "name" character varying NOT NULL,
                "tokenPrefix" character varying NOT NULL,
                "tokenHash" character varying NOT NULL,
                "scopes" jsonb DEFAULT '["sdk:read", "packages:read"]',
                "expiresAt" TIMESTAMP WITH TIME ZONE,
                "lastUsedAt" TIMESTAMP WITH TIME ZONE,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_developer_tokens_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_developer_tokens_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_developer_tokens_userId" ON "developer_tokens" ("userId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "developer_tokens"`);
    }
}
