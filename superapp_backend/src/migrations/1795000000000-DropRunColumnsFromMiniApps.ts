import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalization step 1c (contract): scan and build state lives only in
 * mini_app_scans and mini_app_builds. The code writes and reads those tables
 * (MiniAppRunsService), so the sync triggers from CreateMiniAppScans and the
 * legacy columns on mini_apps go.
 *
 * securityChecks stays on mini_apps: it is the set of checks the developer
 * chose (configuration), not a scan result. Each scan row records the checks
 * it ran.
 *
 * down() puts the columns back, filled from the latest runs.
 */
const COLUMNS: Array<[string, string]> = [
  ['validationStatus', `character varying DEFAULT 'PENDING'`],
  ['validationStages', `jsonb DEFAULT '{}'`],
  ['validationReport', 'jsonb'],
  ['validationErrors', 'jsonb'],
  ['buildStatus', `character varying DEFAULT 'IDLE'`],
  ['buildStages', `jsonb DEFAULT '{}'`],
  ['buildError', 'text'],
];

export class DropRunColumnsFromMiniApps1795000000000 implements MigrationInterface {
  name = 'DropRunColumnsFromMiniApps1795000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `DROP TRIGGER IF EXISTS "trg_mini_app_scan_sync" ON "mini_apps"`,
    );
    await q.query(
      `DROP TRIGGER IF EXISTS "trg_mini_app_build_sync" ON "mini_apps"`,
    );
    await q.query(`DROP FUNCTION IF EXISTS mini_app_scan_sync()`);
    await q.query(`DROP FUNCTION IF EXISTS mini_app_build_sync()`);
    await q.query(
      `DROP FUNCTION IF EXISTS mini_app_scan_record(uuid, varchar, varchar, varchar, varchar, jsonb, jsonb, jsonb, jsonb)`,
    );

    // Scan results inside pendingRevision are in mini_app_scans (scope REVISION)
    await q.query(`
      UPDATE "mini_apps"
      SET "pendingRevision" = "pendingRevision" - 'validationStatus' - 'validationStages' - 'validationReport' - 'validationErrors'
      WHERE jsonb_typeof("pendingRevision") = 'object'
        AND ("pendingRevision" ?| ARRAY['validationStatus', 'validationStages', 'validationReport', 'validationErrors'])`);

    for (const [col] of COLUMNS) {
      await q.query(`ALTER TABLE "mini_apps" DROP COLUMN IF EXISTS "${col}"`);
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const [col, type] of COLUMNS) {
      await q.query(
        `ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "${col}" ${type}`,
      );
    }
    await q.query(`
      UPDATE "mini_apps" m SET
        "validationStatus" = s."status", "validationStages" = s."stages",
        "validationReport" = s."report", "validationErrors" = s."errors"
      FROM (SELECT DISTINCT ON ("miniAppId") * FROM "mini_app_scans"
            WHERE "scope" = 'APP' ORDER BY "miniAppId", "createdAt" DESC) s
      WHERE s."miniAppId" = m."id"`);
    await q.query(`
      UPDATE "mini_apps" m SET
        "buildStatus" = b."buildStatus", "buildStages" = b."buildStages", "buildError" = b."buildError"
      FROM (SELECT DISTINCT ON ("miniAppId") * FROM "mini_app_builds"
            ORDER BY "miniAppId", "createdAt" DESC) b
      WHERE b."miniAppId" = m."id"`);
  }
}
