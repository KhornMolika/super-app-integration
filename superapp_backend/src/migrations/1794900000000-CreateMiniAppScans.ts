import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalization step 1 (expand): scan and build runs get their own rows.
 *
 *   mini_app_scans   new: one row per security scan run (status, stages, report,
 *                    errors, checks), scoped APP or REVISION.
 *   mini_app_builds  loses the scan columns it never used (validation*), gains
 *                    buildType. One row per test or release build run.
 *
 * Existing state is backfilled. Until every writer moves to these tables, two
 * triggers copy changes of the legacy columns on mini_apps (and of the scan
 * fields inside pendingRevision) into a new or the latest run row. A trigger
 * error only raises a WARNING: it never blocks the mini_apps write.
 *
 * The legacy mini_apps columns stay for now; a later migration drops them
 * together with the triggers.
 */

/** A run starts (new row) on these status values; others update the latest row. */
const SCAN_START = `('RUNNING')`;
const SCAN_DONE = `('PASSED', 'FAILED', 'CANCELLED', 'ERROR')`;
const BUILD_START = `('QUEUED', 'BUILDING', 'RUNNING')`;
const BUILD_DONE = `('COMPLETED', 'FAILED', 'SUCCESS', 'CANCELLED', 'ABORTED')`;

export class CreateMiniAppScans1794900000000 implements MigrationInterface {
  name = 'CreateMiniAppScans1794900000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "mini_app_scans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "miniAppId" uuid NOT NULL,
        "versionId" uuid,
        "version" character varying,
        "scope" character varying NOT NULL DEFAULT 'APP',
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "stages" jsonb NOT NULL DEFAULT '{}',
        "report" jsonb,
        "errors" jsonb,
        "checks" jsonb NOT NULL DEFAULT '[]',
        "actorId" uuid,
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mini_app_scans" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mini_app_scans_app" FOREIGN KEY ("miniAppId")
          REFERENCES "mini_apps"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_mini_app_scans_version" FOREIGN KEY ("versionId")
          REFERENCES "mini_app_versions"("id") ON DELETE SET NULL
      )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mini_app_scans_app_created" ON "mini_app_scans" ("miniAppId", "createdAt")`,
    );

    await q.query(
      `ALTER TABLE "mini_app_builds" ADD COLUMN IF NOT EXISTS "buildType" character varying`,
    );

    // --- Backfill -----------------------------------------------------------

    const buildCols = await this.columnsOf(q, 'mini_app_builds');
    if (buildCols.has('validationStatus')) {
      // Scan results that were stored on build rows
      await q.query(`
        INSERT INTO "mini_app_scans"
          ("miniAppId", "versionId", "version", "scope", "status", "stages", "report", "errors",
           "actorId", "startedAt", "completedAt", "createdAt", "updatedAt")
        SELECT b."miniAppId", b."versionId", b."version", 'APP', b."validationStatus",
               COALESCE(b."validationStages", '{}'::jsonb), b."validationReport", b."validationErrors",
               CASE WHEN b."actorId" ~* '^[0-9a-f-]{36}$' THEN b."actorId"::uuid END,
               b."startedAt", b."completedAt", b."createdAt", b."updatedAt"
        FROM "mini_app_builds" b
        WHERE b."validationStatus" IS DISTINCT FROM 'PENDING' OR b."validationReport" IS NOT NULL`);
      for (const col of [
        'validationStatus',
        'validationStages',
        'validationReport',
        'validationErrors',
      ]) {
        await q.query(
          `ALTER TABLE "mini_app_builds" DROP COLUMN IF EXISTS "${col}"`,
        );
      }
    }

    // The app's own latest scan
    await q.query(`
      INSERT INTO "mini_app_scans"
        ("miniAppId", "versionId", "version", "scope", "status", "stages", "report", "errors",
         "checks", "startedAt", "completedAt", "createdAt", "updatedAt")
      SELECT m."id", v."id", m."version", 'APP', m."validationStatus",
             COALESCE(m."validationStages", '{}'::jsonb), m."validationReport", m."validationErrors",
             COALESCE(m."securityChecks", '[]'::jsonb), m."updatedAt",
             CASE WHEN m."validationStatus" IN ${SCAN_DONE} THEN m."updatedAt" END,
             m."updatedAt", m."updatedAt"
      FROM "mini_apps" m
      LEFT JOIN "mini_app_versions" v ON v."miniAppId" = m."id" AND v."version" = m."version"
      WHERE (m."validationStatus" IS DISTINCT FROM 'PENDING'
             OR m."validationReport" IS NOT NULL
             OR COALESCE(m."validationStages", '{}'::jsonb) <> '{}'::jsonb)
        AND NOT EXISTS (SELECT 1 FROM "mini_app_scans" s WHERE s."miniAppId" = m."id" AND s."scope" = 'APP')`);

    // The pending revision's latest scan
    await q.query(`
      INSERT INTO "mini_app_scans"
        ("miniAppId", "versionId", "version", "scope", "status", "stages", "report", "errors",
         "checks", "startedAt", "completedAt", "createdAt", "updatedAt")
      SELECT m."id", v."id", m."pendingRevision"->>'version', 'REVISION',
             m."pendingRevision"->>'validationStatus',
             COALESCE(m."pendingRevision"->'validationStages', '{}'::jsonb),
             m."pendingRevision"->'validationReport', m."pendingRevision"->'validationErrors',
             COALESCE(m."securityChecks", '[]'::jsonb), m."updatedAt",
             CASE WHEN m."pendingRevision"->>'validationStatus' IN ${SCAN_DONE} THEN m."updatedAt" END,
             m."updatedAt", m."updatedAt"
      FROM "mini_apps" m
      LEFT JOIN "mini_app_versions" v
        ON v."miniAppId" = m."id" AND v."version" = m."pendingRevision"->>'version'
      WHERE jsonb_typeof(m."pendingRevision") = 'object'
        AND m."pendingRevision" ? 'validationStatus'
        AND NOT EXISTS (SELECT 1 FROM "mini_app_scans" s WHERE s."miniAppId" = m."id" AND s."scope" = 'REVISION')`);

    // The app's latest build, when none is recorded yet
    await q.query(`
      INSERT INTO "mini_app_builds"
        ("miniAppId", "versionId", "version", "buildStatus", "buildStages", "buildError",
         "startedAt", "completedAt", "createdAt", "updatedAt")
      SELECT m."id", v."id", COALESCE(m."activeTestVersion", m."version"), m."buildStatus",
             COALESCE(m."buildStages", '{}'::jsonb), m."buildError", m."updatedAt",
             CASE WHEN m."buildStatus" IN ${BUILD_DONE} THEN m."updatedAt" END,
             m."updatedAt", m."updatedAt"
      FROM "mini_apps" m
      LEFT JOIN "mini_app_versions" v
        ON v."miniAppId" = m."id" AND v."version" = COALESCE(m."activeTestVersion", m."version")
      WHERE m."buildStatus" IS NOT NULL AND m."buildStatus" <> 'IDLE'
        AND NOT EXISTS (SELECT 1 FROM "mini_app_builds" b WHERE b."miniAppId" = m."id")`);

    // --- Dual-write triggers --------------------------------------------------

    await q.query(`
      CREATE OR REPLACE FUNCTION mini_app_scan_record(
        p_app uuid, p_scope varchar, p_version varchar,
        p_status varchar, p_old_status varchar,
        p_stages jsonb, p_report jsonb, p_errors jsonb, p_checks jsonb
      ) RETURNS void LANGUAGE plpgsql AS $fn$
      DECLARE
        latest "mini_app_scans"%ROWTYPE;
        v_id uuid;
      BEGIN
        SELECT * INTO latest FROM "mini_app_scans"
          WHERE "miniAppId" = p_app AND "scope" = p_scope
          ORDER BY "createdAt" DESC LIMIT 1;

        -- Back to PENDING is a reset, not a run: it ends a run still in progress
        IF COALESCE(p_status, 'PENDING') = 'PENDING' THEN
          IF latest."id" IS NOT NULL AND latest."status" NOT IN ${SCAN_DONE} THEN
            UPDATE "mini_app_scans"
              SET "status" = 'CANCELLED', "completedAt" = now(), "updatedAt" = now()
              WHERE "id" = latest."id";
          END IF;
          RETURN;
        END IF;

        IF latest."id" IS NULL
           OR (p_status IN ${SCAN_START} AND p_old_status IS DISTINCT FROM p_status)
           OR (latest."status" IN ${SCAN_DONE} AND p_status IS DISTINCT FROM latest."status") THEN
          SELECT "id" INTO v_id FROM "mini_app_versions"
            WHERE "miniAppId" = p_app AND "version" = p_version LIMIT 1;
          INSERT INTO "mini_app_scans"
            ("miniAppId", "versionId", "version", "scope", "status", "stages", "report", "errors",
             "checks", "startedAt", "completedAt")
          VALUES (p_app, v_id, p_version, p_scope, COALESCE(p_status, 'PENDING'),
                  COALESCE(p_stages, '{}'::jsonb), p_report, p_errors, COALESCE(p_checks, '[]'::jsonb),
                  now(), CASE WHEN p_status IN ${SCAN_DONE} THEN now() END);
        ELSE
          UPDATE "mini_app_scans" SET
            "status" = COALESCE(p_status, "status"),
            "stages" = COALESCE(p_stages, '{}'::jsonb),
            "report" = p_report,
            "errors" = p_errors,
            "completedAt" = CASE WHEN p_status IN ${SCAN_DONE} THEN COALESCE("completedAt", now()) END,
            "updatedAt" = now()
          WHERE "id" = latest."id";
        END IF;
      END
      $fn$`);

    await q.query(`
      CREATE OR REPLACE FUNCTION mini_app_scan_sync() RETURNS trigger LANGUAGE plpgsql AS $fn$
      DECLARE
        rev_old jsonb := CASE WHEN jsonb_typeof(OLD."pendingRevision") = 'object' THEN OLD."pendingRevision" ELSE '{}'::jsonb END;
        rev_new jsonb := CASE WHEN jsonb_typeof(NEW."pendingRevision") = 'object' THEN NEW."pendingRevision" ELSE '{}'::jsonb END;
      BEGIN
        BEGIN
          IF (NEW."validationStatus", NEW."validationStages", NEW."validationReport", NEW."validationErrors")
             IS DISTINCT FROM
             (OLD."validationStatus", OLD."validationStages", OLD."validationReport", OLD."validationErrors") THEN
            PERFORM mini_app_scan_record(
              NEW."id", 'APP', NEW."version",
              NEW."validationStatus", OLD."validationStatus",
              NEW."validationStages", NEW."validationReport", NEW."validationErrors", NEW."securityChecks");
          END IF;

          IF rev_new ? 'validationStatus' AND
             (rev_new->'validationStatus', rev_new->'validationStages', rev_new->'validationReport', rev_new->'validationErrors')
             IS DISTINCT FROM
             (rev_old->'validationStatus', rev_old->'validationStages', rev_old->'validationReport', rev_old->'validationErrors') THEN
            PERFORM mini_app_scan_record(
              NEW."id", 'REVISION', rev_new->>'version',
              rev_new->>'validationStatus', rev_old->>'validationStatus',
              rev_new->'validationStages', rev_new->'validationReport', rev_new->'validationErrors', NEW."securityChecks");
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'mini_app_scan_sync skipped for %: %', NEW."id", SQLERRM;
        END;
        RETURN NEW;
      END
      $fn$`);

    await q.query(`
      CREATE OR REPLACE FUNCTION mini_app_build_sync() RETURNS trigger LANGUAGE plpgsql AS $fn$
      DECLARE
        latest "mini_app_builds"%ROWTYPE;
        v_version varchar;
        v_id uuid;
      BEGIN
        BEGIN
          IF (NEW."buildStatus", NEW."buildStages", NEW."buildError")
             IS NOT DISTINCT FROM (OLD."buildStatus", OLD."buildStages", OLD."buildError") THEN
            RETURN NEW;
          END IF;

          SELECT * INTO latest FROM "mini_app_builds"
            WHERE "miniAppId" = NEW."id" ORDER BY "createdAt" DESC LIMIT 1;

          IF latest."id" IS NULL
             OR (NEW."buildStatus" IN ${BUILD_START} AND OLD."buildStatus" IS DISTINCT FROM NEW."buildStatus"
                 AND COALESCE(OLD."buildStatus", 'IDLE') NOT IN ${BUILD_START})
             OR (latest."buildStatus" IN ${BUILD_DONE} AND NEW."buildStatus" IS DISTINCT FROM latest."buildStatus") THEN
            IF NEW."buildStatus" IS NULL OR NEW."buildStatus" = 'IDLE' THEN
              RETURN NEW;
            END IF;
            v_version := COALESCE(
              CASE WHEN jsonb_typeof(NEW."pendingRevision") = 'object' THEN NEW."pendingRevision"->>'version' END,
              NEW."activeTestVersion", NEW."version");
            SELECT "id" INTO v_id FROM "mini_app_versions"
              WHERE "miniAppId" = NEW."id" AND "version" = v_version LIMIT 1;
            INSERT INTO "mini_app_builds"
              ("miniAppId", "versionId", "version", "buildStatus", "buildStages", "buildError",
               "startedAt", "completedAt")
            VALUES (NEW."id", v_id, v_version, NEW."buildStatus", COALESCE(NEW."buildStages", '{}'::jsonb),
                    NEW."buildError", now(),
                    CASE WHEN NEW."buildStatus" IN ${BUILD_DONE} THEN now() END);
          ELSE
            UPDATE "mini_app_builds" SET
              "buildStatus" = COALESCE(NEW."buildStatus", "buildStatus"),
              "buildStages" = COALESCE(NEW."buildStages", '{}'::jsonb),
              "buildError" = NEW."buildError",
              "completedAt" = CASE WHEN NEW."buildStatus" IN ${BUILD_DONE} THEN COALESCE("completedAt", now()) END,
              "updatedAt" = now()
            WHERE "id" = latest."id";
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'mini_app_build_sync skipped for %: %', NEW."id", SQLERRM;
        END;
        RETURN NEW;
      END
      $fn$`);

    await q.query(
      `DROP TRIGGER IF EXISTS "trg_mini_app_scan_sync" ON "mini_apps"`,
    );
    await q.query(`
      CREATE TRIGGER "trg_mini_app_scan_sync"
      AFTER UPDATE OF "validationStatus", "validationStages", "validationReport", "validationErrors", "pendingRevision"
      ON "mini_apps" FOR EACH ROW EXECUTE FUNCTION mini_app_scan_sync()`);
    await q.query(
      `DROP TRIGGER IF EXISTS "trg_mini_app_build_sync" ON "mini_apps"`,
    );
    await q.query(`
      CREATE TRIGGER "trg_mini_app_build_sync"
      AFTER UPDATE OF "buildStatus", "buildStages", "buildError"
      ON "mini_apps" FOR EACH ROW EXECUTE FUNCTION mini_app_build_sync()`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DROP TRIGGER IF EXISTS "trg_mini_app_build_sync" ON "mini_apps"`,
    );
    await q.query(
      `DROP TRIGGER IF EXISTS "trg_mini_app_scan_sync" ON "mini_apps"`,
    );
    await q.query(`DROP FUNCTION IF EXISTS mini_app_build_sync()`);
    await q.query(`DROP FUNCTION IF EXISTS mini_app_scan_sync()`);
    await q.query(
      `DROP FUNCTION IF EXISTS mini_app_scan_record(uuid, varchar, varchar, varchar, varchar, jsonb, jsonb, jsonb, jsonb)`,
    );
    await q.query(`
      ALTER TABLE "mini_app_builds"
        ADD COLUMN IF NOT EXISTS "validationStatus" character varying NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "validationStages" jsonb DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "validationReport" jsonb,
        ADD COLUMN IF NOT EXISTS "validationErrors" jsonb`);
    await q.query(
      `ALTER TABLE "mini_app_builds" DROP COLUMN IF EXISTS "buildType"`,
    );
    // The scan history has no other home in the old schema
    await q.query(`DROP TABLE IF EXISTS "mini_app_scans"`);
  }

  private async columnsOf(q: QueryRunner, table: string): Promise<Set<string>> {
    const rows: Array<{ column_name: string }> = await q.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [table],
    );
    return new Set(rows.map((r) => r.column_name));
  }
}
