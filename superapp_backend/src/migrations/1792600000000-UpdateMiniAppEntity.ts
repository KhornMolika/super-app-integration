import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMiniAppEntity1792600000000 implements MigrationInterface {
  name = 'UpdateMiniAppEntity1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add slug column if it doesn't already exist
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "slug" character varying`,
    );

    // 2. Backfill slug from name for existing rows
    await queryRunner.query(`
            UPDATE "mini_apps" 
            SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
            WHERE "slug" IS NULL AND "name" IS NOT NULL
        `);

    // 3. Fallback for any rows where name was empty
    await queryRunner.query(`
            UPDATE "mini_apps" 
            SET "slug" = 'miniapp-' || SUBSTRING("id"::text, 1, 8)
            WHERE "slug" IS NULL OR "slug" = ''
        `);

    // 4. Resolve any duplicate slugs by appending unique suffix from ID
    await queryRunner.query(`
            UPDATE "mini_apps" m1
            SET "slug" = m1."slug" || '-' || SUBSTRING(m1."id"::text, 1, 6)
            WHERE EXISTS (
                SELECT 1 FROM "mini_apps" m2 
                WHERE m2."slug" = m1."slug" AND m2."id" <> m1."id"
            )
        `);

    // 5. Create unique index for slug
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_mini_apps_slug" ON "mini_apps" ("slug") WHERE "slug" IS NOT NULL`,
    );

    // 6. Backfill ownerId from ownerEmail for any apps missing ownerId
    await queryRunner.query(`
            UPDATE "mini_apps" m 
            SET "ownerId" = u."id" 
            FROM "user" u 
            WHERE m."ownerId" IS NULL 
              AND m."ownerEmail" IS NOT NULL 
              AND LOWER(m."ownerEmail") = LOWER(u."email")
        `);

    // 7. Drop redundant columns from mini_apps (category, ownerName, ownerEmail)
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "ownerName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "ownerEmail"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "category" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "ownerName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "ownerEmail" character varying`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_mini_apps_slug"`);
    await queryRunner.query(
      `ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "slug"`,
    );
  }
}
