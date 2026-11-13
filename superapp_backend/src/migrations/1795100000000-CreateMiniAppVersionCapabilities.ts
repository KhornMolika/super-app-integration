import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalization step 2 (expand): capabilities are stored per version.
 *
 *   mini_app_version_capabilities  new: one row per capability key per
 *                                  version (required, purpose, the entry as
 *                                  declared, REQUESTED or APPROVED, by whom).
 *
 * Since the versionHistory column stopped being mapped, nothing wrote
 * mini_app_versions rows. This migration first puts the rows in the shape
 * MiniAppVersionsService keeps from now on:
 *   - status values from the old versionHistory JSON become version statuses
 *     (IN_REVIEW/SUBMITTED/PENDING -> DRAFT, TEST -> TESTING);
 *   - a live app has exactly one ACTIVE row (its currentReleaseVersion);
 *   - an unreleased app has exactly one working row (DRAFT or TESTING);
 *   - a live app with a pending revision has one DRAFT row for it;
 *   - surplus rows become DEPRECATED (kept, never deleted).
 * Then each row gets its capabilities: the live or working row from
 * mini_apps.capabilities, the revision row from pendingRevision, older rows
 * from mini_app_versions.permissions.
 *
 * The JSON columns stay (API and mobile still read them); a later step
 * switches the reads and drops them.
 */

const WORKING_STATUS = `
  CASE m."lifecycleStatus"
    WHEN 'ACTIVE' THEN 'ACTIVE'
    WHEN 'APPROVED' THEN 'TESTING' WHEN 'APPROVED_FOR_TESTING' THEN 'TESTING'
    WHEN 'BUILDING' THEN 'TESTING' WHEN 'BUILDING_STAGE_1' THEN 'TESTING'
    WHEN 'TESTING' THEN 'TESTING' WHEN 'TEST_PASSED' THEN 'TESTING'
    WHEN 'BUILDING_STAGE_2' THEN 'TESTING' WHEN 'BUILD_FAILED' THEN 'TESTING'
    WHEN 'DRAFT' THEN 'DRAFT' WHEN 'SUBMITTED' THEN 'DRAFT' WHEN 'IN_REVIEW' THEN 'DRAFT'
    WHEN 'REJECTED' THEN 'DRAFT' WHEN 'CHANGES_REQUESTED' THEN 'DRAFT' WHEN 'QUARANTINE' THEN 'DRAFT'
  END`;

/** Same rule as revisionVersionOf() in versions/version-capabilities.ts. */
const REVISION_VERSION = `
  COALESCE(
    m."pendingRevision"->>'version',
    m."pendingRevision"->>'packageVersion',
    CASE WHEN m."currentReleaseVersion" IS NULL THEN '1.1.0'
         ELSE '1.' || (COALESCE(NULLIF(regexp_replace(split_part(m."currentReleaseVersion", '.', 2), '[^0-9]', '', 'g'), '')::int, 0) + 1) || '.0'
    END)`;

/** Capability rows from a jsonb list, as parseDeclaredCapabilities() reads it. */
function insertCaps(source: string, approved: boolean): string {
  return `
    INSERT INTO "mini_app_version_capabilities"
      ("miniAppId", "versionId", "capabilityKey", "required", "purpose", "declaration", "position", "status", "approvedAt")
    SELECT "miniAppId", "versionId", key, required, purpose, elem,
           (row_number() OVER (PARTITION BY "versionId" ORDER BY pos)) - 1,
           '${approved ? 'APPROVED' : 'REQUESTED'}', ${approved ? 'now()' : 'NULL'}
    FROM (
      SELECT DISTINCT ON (s."versionId", k.key)
             s."miniAppId", s."versionId", k.key, e.elem, e.pos,
             COALESCE(jsonb_typeof(e.elem) = 'object' AND e.elem->'required' = 'true'::jsonb, false) AS required,
             CASE WHEN jsonb_typeof(e.elem) = 'object' AND btrim(COALESCE(e.elem->>'purpose', '')) <> ''
                  THEN e.elem->>'purpose' END AS purpose
      FROM (${source}) s
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(s.list) = 'array' THEN s.list ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS e(elem, pos)
      CROSS JOIN LATERAL (
        SELECT left(lower(btrim(CASE jsonb_typeof(e.elem)
                 WHEN 'string' THEN e.elem #>> '{}'
                 WHEN 'object' THEN COALESCE(e.elem->>'type', e.elem->>'key', e.elem->>'name')
               END)), 100) AS key
      ) k
      WHERE COALESCE(k.key, '') <> ''
        AND NOT EXISTS (SELECT 1 FROM "mini_app_version_capabilities" c WHERE c."versionId" = s."versionId")
      ORDER BY s."versionId", k.key, e.pos
    ) d`;
}

export class CreateMiniAppVersionCapabilities1795100000000 implements MigrationInterface {
  name = 'CreateMiniAppVersionCapabilities1795100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "mini_app_version_capabilities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "miniAppId" uuid NOT NULL,
        "versionId" uuid NOT NULL,
        "capabilityKey" character varying(100) NOT NULL,
        "required" boolean NOT NULL DEFAULT false,
        "purpose" text,
        "declaration" jsonb NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        "status" character varying(20) NOT NULL DEFAULT 'REQUESTED',
        "approvedById" uuid,
        "approvedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mini_app_version_capabilities" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mini_app_version_capabilities_app" FOREIGN KEY ("miniAppId")
          REFERENCES "mini_apps"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_mini_app_version_capabilities_version" FOREIGN KEY ("versionId")
          REFERENCES "mini_app_versions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_mini_app_version_capabilities_approver" FOREIGN KEY ("approvedById")
          REFERENCES "identities"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_mini_app_version_capabilities_status" CHECK ("status" IN ('REQUESTED', 'APPROVED'))
      )`);
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_mini_app_version_capabilities_version_key" ON "mini_app_version_capabilities" ("versionId", "capabilityKey")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mini_app_version_capabilities_app" ON "mini_app_version_capabilities" ("miniAppId")`,
    );

    // 1. Version statuses from the old versionHistory vocabulary
    await q.query(
      `UPDATE "mini_app_versions" SET "status" = 'DRAFT' WHERE upper("status") IN ('IN_REVIEW', 'SUBMITTED', 'PENDING', 'REVIEW')`,
    );
    await q.query(`UPDATE "mini_app_versions" SET "status" = 'TESTING' WHERE upper("status") IN ('TEST', 'IN_TESTING')`);

    // 2. Live apps: exactly one ACTIVE row, the one for currentReleaseVersion
    await q.query(`
      UPDATE "mini_app_versions" v SET "status" = 'ACTIVE'
      FROM "mini_apps" m
      WHERE m."lifecycleStatus" = 'ACTIVE' AND v."miniAppId" = m."id"
        AND NOT EXISTS (SELECT 1 FROM "mini_app_versions" a
                        WHERE a."miniAppId" = m."id" AND a."status" = 'ACTIVE'
                          AND a."version" = COALESCE(m."currentReleaseVersion", '1.0.0'))
        AND v."id" = (SELECT x."id" FROM "mini_app_versions" x
                      WHERE x."miniAppId" = m."id" AND x."version" = COALESCE(m."currentReleaseVersion", '1.0.0')
                      ORDER BY x."createdAt" DESC LIMIT 1)`);
    await q.query(`
      INSERT INTO "mini_app_versions" ("miniAppId", "version", "status", "releasedAt")
      SELECT m."id", COALESCE(m."currentReleaseVersion", '1.0.0'), 'ACTIVE', m."updatedAt"
      FROM "mini_apps" m
      WHERE m."lifecycleStatus" = 'ACTIVE'
        AND NOT EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m."id" AND a."status" = 'ACTIVE')`);
    await q.query(`
      UPDATE "mini_app_versions" v SET "status" = 'PREVIOUS'
      WHERE v."status" = 'ACTIVE' AND v."id" <> (
        SELECT a."id" FROM "mini_app_versions" a JOIN "mini_apps" m ON m."id" = a."miniAppId"
        WHERE a."miniAppId" = v."miniAppId" AND a."status" = 'ACTIVE'
        ORDER BY (a."version" = m."currentReleaseVersion") DESC, a."createdAt" DESC LIMIT 1)`);

    // 3. Unreleased apps: one working row with the lifecycle's status
    await q.query(`
      INSERT INTO "mini_app_versions" ("miniAppId", "version", "status")
      SELECT m."id", COALESCE(m."currentReleaseVersion", '1.0.0'), COALESCE(${WORKING_STATUS}, 'DRAFT')
      FROM "mini_apps" m
      WHERE NOT EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m."id" AND a."status" IN ('ACTIVE', 'DRAFT', 'TESTING'))`);
    await q.query(`
      UPDATE "mini_app_versions" v SET "status" = 'DEPRECATED'
      WHERE v."status" IN ('DRAFT', 'TESTING')
        AND NOT EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = v."miniAppId" AND a."status" = 'ACTIVE')
        AND v."id" <> (SELECT w."id" FROM "mini_app_versions" w
                       WHERE w."miniAppId" = v."miniAppId" AND w."status" IN ('DRAFT', 'TESTING')
                       ORDER BY w."createdAt" DESC LIMIT 1)`);
    await q.query(`
      UPDATE "mini_app_versions" v SET "status" = ${WORKING_STATUS}
      FROM "mini_apps" m
      WHERE v."miniAppId" = m."id" AND v."status" IN ('DRAFT', 'TESTING')
        AND ${WORKING_STATUS} IS NOT NULL AND m."lifecycleStatus" <> 'ACTIVE'
        AND NOT EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m."id" AND a."status" = 'ACTIVE')`);

    // 4. Live apps: one DRAFT row for a pending revision, none otherwise
    await q.query(`
      UPDATE "mini_app_versions" v SET "status" = 'DEPRECATED'
      FROM "mini_apps" m
      WHERE v."miniAppId" = m."id" AND v."status" IN ('DRAFT', 'TESTING')
        AND EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m."id" AND a."status" = 'ACTIVE')
        AND (m."pendingRevision" IS NULL OR v."status" = 'TESTING' OR v."id" <> (
              SELECT d."id" FROM "mini_app_versions" d
              WHERE d."miniAppId" = m."id" AND d."status" = 'DRAFT'
              ORDER BY d."createdAt" DESC LIMIT 1))`);
    await q.query(`
      INSERT INTO "mini_app_versions" ("miniAppId", "version", "status", "changelog")
      SELECT m."id", ${REVISION_VERSION}, 'DRAFT', m."pendingRevision"->>'changelog'
      FROM "mini_apps" m
      WHERE m."pendingRevision" IS NOT NULL
        AND EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m."id" AND a."status" = 'ACTIVE')
        AND NOT EXISTS (SELECT 1 FROM "mini_app_versions" d WHERE d."miniAppId" = m."id" AND d."status" = 'DRAFT')`);
    await q.query(`
      UPDATE "mini_app_versions" v SET "version" = ${REVISION_VERSION}
      FROM "mini_apps" m
      WHERE v."miniAppId" = m."id" AND v."status" = 'DRAFT' AND m."pendingRevision" IS NOT NULL
        AND EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m."id" AND a."status" = 'ACTIVE')`);

    // 5. Capabilities. Live rows were approved when they went live; a working
    //    row once the app was approved; a revision is still under review.
    await q.query(
      insertCaps(
        `SELECT m."id" AS "miniAppId", v."id" AS "versionId", m."capabilities" AS list
         FROM "mini_app_versions" v JOIN "mini_apps" m ON m."id" = v."miniAppId"
         WHERE v."status" = 'ACTIVE'
            OR (v."status" = 'TESTING' AND NOT EXISTS (
                  SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m."id" AND a."status" = 'ACTIVE'))`,
        true,
      ),
    );
    await q.query(
      insertCaps(
        `SELECT m."id" AS "miniAppId", v."id" AS "versionId", m."capabilities" AS list
         FROM "mini_app_versions" v JOIN "mini_apps" m ON m."id" = v."miniAppId"
         WHERE v."status" = 'DRAFT'
           AND NOT EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m."id" AND a."status" = 'ACTIVE')`,
        false,
      ),
    );
    await q.query(
      insertCaps(
        `SELECT m."id" AS "miniAppId", v."id" AS "versionId",
                COALESCE(m."pendingRevision"->'capabilities', m."pendingRevision"->'permissions', m."capabilities") AS list
         FROM "mini_app_versions" v JOIN "mini_apps" m ON m."id" = v."miniAppId"
         WHERE v."status" = 'DRAFT' AND m."pendingRevision" IS NOT NULL
           AND EXISTS (SELECT 1 FROM "mini_app_versions" a WHERE a."miniAppId" = m."id" AND a."status" = 'ACTIVE')`,
        false,
      ),
    );
    await q.query(
      insertCaps(
        `SELECT v."miniAppId", v."id" AS "versionId", v."permissions" AS list
         FROM "mini_app_versions" v
         WHERE v."status" NOT IN ('ACTIVE', 'DRAFT', 'TESTING')`,
        true,
      ),
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    // The version-row clean-up in up() is not undone: it only fixed statuses
    // and added missing rows; mini_apps keeps every capability list.
    await q.query(`DROP TABLE IF EXISTS "mini_app_version_capabilities"`);
  }
}
