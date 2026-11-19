import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSuperAppBanners1796300000000 implements MigrationInterface {
  name = 'CreateSuperAppBanners1796300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "superapp_banners" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(255) NOT NULL,
        "description" text,
        "imageUrl" varchar(500) NOT NULL,
        "actionType" varchar(50) NOT NULL DEFAULT 'NONE',
        "actionValue" varchar(500),
        "displayOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "startDate" TIMESTAMP WITH TIME ZONE,
        "endDate" TIMESTAMP WITH TIME ZONE,
        "targetAudience" varchar(50) NOT NULL DEFAULT 'PUBLIC',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_superapp_banners" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_superapp_banners_order_active" ON "superapp_banners" ("displayOrder", "isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_superapp_banners_audience" ON "superapp_banners" ("targetAudience")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_superapp_banners_audience"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_superapp_banners_order_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "superapp_banners"`);
  }
}
