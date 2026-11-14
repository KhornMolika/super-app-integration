import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 6f: the suspend / archive history gets its own table.
 *
 *   mini_apps.suspension, archiveRequest (jsonb, latest state only)
 *     -> mini_app_status_events: one row per suspend, resume, archive
 *        request, decline, archive and restore, with actor and reason
 *
 * The app's current suspension and archiveRequest are replayed from these
 * rows (src/miniapps/status/status-events.ts). Existing state becomes events:
 * a suspension -> SUSPENDED (+ ARCHIVED when it carries archivedAt), an
 * archive request -> ARCHIVE_REQUESTED. down puts the two columns back from
 * the replayed state.
 */
export class CreateMiniAppStatusEvents1795900000000 implements MigrationInterface {
  name = 'CreateMiniAppStatusEvents1795900000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "mini_app_status_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "miniAppId" uuid NOT NULL,
        "type" varchar(30) NOT NULL,
        "reason" text,
        "actorId" varchar(64),
        "actorName" varchar,
        "previousAvailability" varchar(20),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mini_app_status_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mini_app_status_events_app" FOREIGN KEY ("miniAppId")
          REFERENCES "mini_apps"("id") ON DELETE CASCADE
      )
    `);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mini_app_status_events_app_created" ON "mini_app_status_events" ("miniAppId", "createdAt")`,
    );

    const cols: { column_name: string }[] = await q.query(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'mini_apps' AND column_name IN ('suspension', 'archiveRequest')
    `);
    const has = (c: string) => cols.some((r) => r.column_name === c);
    const at = (expr: string) => `COALESCE(NULLIF(${expr}, '')::timestamptz, now())`;

    if (has('suspension')) {
      await q.query(`
        INSERT INTO "mini_app_status_events" ("miniAppId", "type", "reason", "actorId", "actorName", "previousAvailability", "createdAt")
        SELECT m.id, 'SUSPENDED', m."suspension"->>'reason', LEFT(m."suspension"->>'suspendedById', 64),
               m."suspension"->>'suspendedByName', m."suspension"->>'previousAvailability',
               ${at(`m."suspension"->>'suspendedAt'`)}
          FROM "mini_apps" m
         WHERE m."suspension" IS NOT NULL AND jsonb_typeof(m."suspension") = 'object'
      `);
      await q.query(`
        INSERT INTO "mini_app_status_events" ("miniAppId", "type", "reason", "createdAt")
        SELECT m.id, 'ARCHIVED', m."suspension"->>'reason', ${at(`m."suspension"->>'archivedAt'`)}
          FROM "mini_apps" m
         WHERE jsonb_typeof(m."suspension") = 'object' AND m."suspension" ? 'archivedAt'
      `);
    }
    if (has('archiveRequest')) {
      await q.query(`
        INSERT INTO "mini_app_status_events" ("miniAppId", "type", "reason", "actorId", "actorName", "createdAt")
        SELECT m.id, 'ARCHIVE_REQUESTED', m."archiveRequest"->>'reason', LEFT(m."archiveRequest"->>'requestedById', 64),
               m."archiveRequest"->>'requestedByName', ${at(`m."archiveRequest"->>'requestedAt'`)}
          FROM "mini_apps" m
         WHERE m."archiveRequest" IS NOT NULL AND jsonb_typeof(m."archiveRequest") = 'object'
      `);
    }
    await q.query(`ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "suspension", DROP COLUMN IF EXISTS "archiveRequest"`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "mini_apps"
        ADD COLUMN IF NOT EXISTS "suspension" jsonb,
        ADD COLUMN IF NOT EXISTS "archiveRequest" jsonb
    `);
    // The latest SUSPENDED event since the last RESUMED / RESTORED (ARCHIVED adds archivedAt)
    await q.query(`
      UPDATE "mini_apps" m SET "suspension" = s.state
        FROM (
          SELECT DISTINCT ON (e."miniAppId") e."miniAppId",
                 jsonb_strip_nulls(jsonb_build_object(
                   'reason', COALESCE(arch."reason", e."reason"),
                   'suspendedById', e."actorId", 'suspendedByName', e."actorName",
                   'suspendedAt', to_char(e."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                   'previousAvailability', e."previousAvailability",
                   'archivedAt', to_char(arch."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))) AS state
            FROM "mini_app_status_events" e
            LEFT JOIN LATERAL (
              SELECT a."reason", a."createdAt" FROM "mini_app_status_events" a
               WHERE a."miniAppId" = e."miniAppId" AND a."type" = 'ARCHIVED' AND a."createdAt" >= e."createdAt"
               ORDER BY a."createdAt" DESC LIMIT 1) arch ON true
           WHERE e."type" IN ('SUSPENDED', 'ARCHIVED')
             AND NOT EXISTS (SELECT 1 FROM "mini_app_status_events" r
                              WHERE r."miniAppId" = e."miniAppId" AND r."type" IN ('RESUMED', 'RESTORED')
                                AND r."createdAt" > e."createdAt")
           ORDER BY e."miniAppId", (e."type" = 'SUSPENDED') DESC, e."createdAt" DESC
        ) s
       WHERE s."miniAppId" = m.id
    `);
    await q.query(`
      UPDATE "mini_apps" m SET "archiveRequest" = s.state
        FROM (
          SELECT DISTINCT ON (e."miniAppId") e."miniAppId",
                 jsonb_strip_nulls(jsonb_build_object(
                   'reason', e."reason", 'requestedById', e."actorId", 'requestedByName', e."actorName",
                   'requestedAt', to_char(e."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))) AS state
            FROM "mini_app_status_events" e
           WHERE e."type" = 'ARCHIVE_REQUESTED'
             AND NOT EXISTS (SELECT 1 FROM "mini_app_status_events" r
                              WHERE r."miniAppId" = e."miniAppId"
                                AND r."type" IN ('ARCHIVED', 'ARCHIVE_DECLINED', 'RESUMED', 'RESTORED')
                                AND r."createdAt" > e."createdAt")
           ORDER BY e."miniAppId", e."createdAt" DESC
        ) s
       WHERE s."miniAppId" = m.id
    `);
    await q.query(`DROP TABLE IF EXISTS "mini_app_status_events"`);
  }
}
