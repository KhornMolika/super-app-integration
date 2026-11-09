import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aligns the physical schema with docs/architecture/DATABASE_SCHEMA_MASTER_PLAN.md:
 *
 *  A. Data fixes so the new constraints can be enforced on existing rows
 *  B. Table renames to the documented names
 *  C. Identity FK columns renamed to "identityId"
 *  D. Documented ON DELETE rules (mini_apps.organizationId RESTRICT + NOT NULL,
 *     mini_apps.ownerId SET NULL, capability_proposals.requestedById SET NULL)
 *  E. Missing constraints (staffId unique per agency, organizations.code
 *     NOT NULL + UNIQUE, SUSPENDED organization status)
 *  F. Drop legacy pre-identities tables, after a final idempotent copy of any
 *     legacy capability rows into the current capability tables
 *
 * Not covered (still pending in the master plan): slimming mini_apps by moving
 * integration/build columns into mini_app_versions.integrationConfig.
 *
 * Section F is irreversible: `down` restores names and constraints but not the
 * dropped legacy tables. Take a database backup before running in production.
 */

const TABLE_RENAMES: Array<[string, string]> = [
  ['role', 'roles'],
  ['permission', 'permissions'],
  ['notification', 'notifications'],
  ['miniapp_versions', 'mini_app_versions'],
  ['miniapp_builds', 'mini_app_builds'],
  ['miniapp_legal', 'mini_app_legal'],
  ['mini_app_issue', 'mini_app_issues'],
  ['end_user_refresh_tokens', 'refresh_tokens'],
];

// [table (new name), old column, new column]
const COLUMN_RENAMES: Array<[string, string, string]> = [
  ['mini_app_collaborators', 'userId', 'identityId'],
  ['notifications', 'userId', 'identityId'],
  ['developer_tokens', 'userId', 'identityId'],
  ['refresh_tokens', 'endUserId', 'identityId'],
];

// Dropped in this order (children before parents). Plain DROP, no CASCADE:
// an unexpected dependency aborts the migration instead of silently dropping it.
const LEGACY_TABLES = [
  'permission_proposals',
  'user_roles',
  'miniapp_activities',
  'permission_definitions',
  'user',
  'users',
  'end_users',
  'end_user',
];

export class MatchSchemaMasterPlan1794400000000 implements MigrationInterface {
  name = 'MatchSchemaMasterPlan1794400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------- A. Data fixes ----------
    await this.backfillOrganizationCodes(queryRunner);
    await this.backfillMiniAppOrganizations(queryRunner);
    await this.dedupeStaffIds(queryRunner);

    // ---------- B. Table renames ----------
    for (const [from, to] of TABLE_RENAMES) {
      if ((await queryRunner.hasTable(from)) && !(await queryRunner.hasTable(to))) {
        await queryRunner.query(`ALTER TABLE "${from}" RENAME TO "${to}"`);
      }
    }

    // ---------- C. Identity FK column renames ----------
    for (const [table, from, to] of COLUMN_RENAMES) {
      const cols = await this.columns(queryRunner, table);
      if (cols.has(from) && !cols.has(to)) {
        await queryRunner.query(`ALTER TABLE "${table}" RENAME COLUMN "${from}" TO "${to}"`);
      }
    }

    // ---------- D. ON DELETE rules ----------
    await queryRunner.query(`ALTER TABLE "mini_apps" ALTER COLUMN "organizationId" SET NOT NULL`);
    await this.replaceForeignKey(queryRunner, 'mini_apps', 'organizationId', 'FK_mini_apps_organizationId', 'organizations', 'RESTRICT');
    await this.replaceForeignKey(queryRunner, 'mini_apps', 'ownerId', 'FK_9eedefb930e4503d9c874302a6e', 'identities', 'SET NULL');
    await this.replaceForeignKey(queryRunner, 'capability_proposals', 'requestedById', 'FK_b3bff59b921d6c3cb690f36796a', 'identities', 'SET NULL');

    // ---------- E. Missing constraints ----------
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_staff_agency_staffId') THEN
          ALTER TABLE "staff_profiles" ADD CONSTRAINT "UQ_staff_agency_staffId" UNIQUE ("organizationId", "staffId");
        END IF;
      END $$;
    `);
    await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "code" SET NOT NULL`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_organizations_code') THEN
          ALTER TABLE "organizations" ADD CONSTRAINT "UQ_organizations_code" UNIQUE ("code");
        END IF;
      END $$;
    `);
    await queryRunner.query(`ALTER TYPE "organizations_status_enum" ADD VALUE IF NOT EXISTS 'SUSPENDED'`);

    // ---------- F. Drop legacy tables ----------
    await this.copyLegacyCapabilityRows(queryRunner);
    for (const table of LEGACY_TABLES) {
      if (await queryRunner.hasTable(table)) {
        await queryRunner.query(`DROP TABLE "${table}"`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // F is irreversible (legacy data is gone); restore from backup if needed.
    await queryRunner.query(`ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "UQ_organizations_code"`);
    await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "code" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "staff_profiles" DROP CONSTRAINT IF EXISTS "UQ_staff_agency_staffId"`);
    // The SUSPENDED enum value cannot be removed without recreating the type; it is left in place.

    await this.replaceForeignKey(queryRunner, 'capability_proposals', 'requestedById', 'FK_b3bff59b921d6c3cb690f36796a', 'identities', 'NO ACTION');
    await this.replaceForeignKey(queryRunner, 'mini_apps', 'ownerId', 'FK_9eedefb930e4503d9c874302a6e', 'identities', 'NO ACTION');
    await this.replaceForeignKey(queryRunner, 'mini_apps', 'organizationId', 'FK_mini_apps_organizationId', 'organizations', 'SET NULL');
    await queryRunner.query(`ALTER TABLE "mini_apps" ALTER COLUMN "organizationId" DROP NOT NULL`);

    for (const [table, from, to] of [...COLUMN_RENAMES].reverse()) {
      const cols = await this.columns(queryRunner, table);
      if (cols.has(to) && !cols.has(from)) {
        await queryRunner.query(`ALTER TABLE "${table}" RENAME COLUMN "${to}" TO "${from}"`);
      }
    }
    for (const [from, to] of [...TABLE_RENAMES].reverse()) {
      if ((await queryRunner.hasTable(to)) && !(await queryRunner.hasTable(from))) {
        await queryRunner.query(`ALTER TABLE "${to}" RENAME TO "${from}"`);
      }
    }
  }

  /** Every organization gets a unique, non-empty code (needed for NOT NULL + UNIQUE). */
  private async backfillOrganizationCodes(queryRunner: QueryRunner): Promise<void> {
    const orgs: Array<{ id: string; name: string; code: string | null }> = await queryRunner.query(
      `SELECT "id", "name", "code" FROM "organizations" ORDER BY "createdAt" ASC, "id" ASC`,
    );
    const taken = new Set<string>();
    const updates: Array<{ id: string; code: string }> = [];

    // Keep existing non-empty codes; the oldest holder of a duplicate keeps it.
    const needsCode: typeof orgs = [];
    for (const org of orgs) {
      const code = org.code?.trim();
      if (code && !taken.has(code)) {
        taken.add(code);
        if (code !== org.code) updates.push({ id: org.id, code });
      } else {
        needsCode.push(org);
      }
    }

    for (const org of needsCode) {
      const base =
        org.code?.trim() ||
        (org.name || '')
          .split(/[^A-Za-z0-9]+/)
          .filter(Boolean)
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 10) ||
        `ORG-${org.id.slice(0, 6).toUpperCase()}`;
      let code = base;
      for (let n = 2; taken.has(code); n++) code = `${base}-${n}`;
      taken.add(code);
      updates.push({ id: org.id, code });
    }

    for (const u of updates) {
      await queryRunner.query(`UPDATE "organizations" SET "code" = $1 WHERE "id" = $2`, [u.code, u.id]);
    }
  }

  /** mini_apps.organizationId becomes NOT NULL: resolve legacy rows without one. */
  private async backfillMiniAppOrganizations(queryRunner: QueryRunner): Promise<void> {
    const cols = await this.columns(queryRunner, 'mini_apps');

    // 1. Legacy organizationCode / organization name columns
    if (cols.has('organizationCode')) {
      await queryRunner.query(`
        UPDATE "mini_apps" m SET "organizationId" = o."id"
        FROM "organizations" o
        WHERE m."organizationId" IS NULL AND m."organizationCode" IS NOT NULL
          AND lower(trim(o."code")) = lower(trim(m."organizationCode"));
      `);
    }
    if (cols.has('organization')) {
      await queryRunner.query(`
        UPDATE "mini_apps" m SET "organizationId" = o."id"
        FROM "organizations" o
        WHERE m."organizationId" IS NULL AND m."organization" IS NOT NULL
          AND lower(trim(o."name")) = lower(trim(m."organization"));
      `);
    }

    // 2. The owner's agency
    await queryRunner.query(`
      UPDATE "mini_apps" m SET "organizationId" = sp."organizationId"
      FROM "staff_profiles" sp
      WHERE m."organizationId" IS NULL AND sp."identityId" = m."ownerId";
    `);

    // 3. Last resort: the root regulatory authority (FSA, or the oldest root org)
    await queryRunner.query(`
      UPDATE "mini_apps" SET "organizationId" = (
        SELECT "id" FROM "organizations"
        WHERE "parentId" IS NULL
        ORDER BY (upper("code") = 'FSA') DESC, "createdAt" ASC
        LIMIT 1
      )
      WHERE "organizationId" IS NULL;
    `);

    const [{ remaining }] = await queryRunner.query(
      `SELECT count(*)::int AS remaining FROM "mini_apps" WHERE "organizationId" IS NULL`,
    );
    if (remaining > 0) {
      throw new Error(
        `MatchSchemaMasterPlan: ${remaining} mini_apps have no organization and no root organization exists to assign them to. Create an organization first.`,
      );
    }
  }

  /** UQ_staff_agency_staffId: suffix later duplicates (oldest keeps the plain staffId). */
  private async dedupeStaffIds(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH ranked AS (
        SELECT "id", "staffId",
               row_number() OVER (PARTITION BY "organizationId", "staffId" ORDER BY "createdAt", "id") AS rn
        FROM "staff_profiles"
        WHERE "staffId" IS NOT NULL
      )
      UPDATE "staff_profiles" sp
      SET "staffId" = left(r."staffId", 45) || '-' || r.rn
      FROM ranked r
      WHERE sp."id" = r."id" AND r.rn > 1;
    `);
  }

  /** Re-run the legacy capability copies so rows written after 1792690000000 are kept. */
  private async copyLegacyCapabilityRows(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('permission_definitions')) {
      await queryRunner.query(`
        INSERT INTO "capability_definitions" (
          "id", "key", "name", "description", "category", "isActive", "isDeprecated",
          "introducedInVersion", "deprecatedInVersion", "minSuperAppVersion",
          "maxSuperAppVersion", "metadata", "createdAt", "updatedAt")
        SELECT "id", "key", "name", "description", "category", "isActive", "isDeprecated",
          "introducedInVersion", "deprecatedInVersion", "minSuperAppVersion",
          "maxSuperAppVersion", "metadata", "createdAt", "updatedAt"
        FROM "permission_definitions"
        ON CONFLICT DO NOTHING;
      `);
    }

    if (await queryRunner.hasTable('permission_proposals')) {
      const legacyUser = (await queryRunner.hasTable('user')) ? 'user' : null;
      // requestedById pointed at legacy "user" ids: remap to the identity by email, else NULL
      const requester = legacyUser
        ? `(SELECT i."id" FROM "${legacyUser}" u JOIN "identities" i ON i."email" = lower(trim(u."email")) WHERE u."id" = pp."requestedById")`
        : `(SELECT i."id" FROM "identities" i WHERE i."id" = pp."requestedById")`;
      await queryRunner.query(`
        INSERT INTO "capability_proposals" (
          "id", "capabilityKey", "capabilityName", "description", "status",
          "adminDecisionReason", "targetSuperAppVersion", "implementedInSuperAppVersion",
          "metadata", "createdAt", "updatedAt", "miniAppId", "requestedById")
        SELECT pp."id", pp."permissionKey", pp."permissionName", pp."description", pp."status"::text,
          pp."adminDecisionReason", pp."targetSuperAppVersion", pp."implementedInSuperAppVersion",
          pp."metadata", pp."createdAt", pp."updatedAt",
          (SELECT m."id" FROM "mini_apps" m WHERE m."id" = pp."miniAppId"),
          ${requester}
        FROM "permission_proposals" pp
        ON CONFLICT DO NOTHING;
      `);
    }
  }

  private async replaceForeignKey(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    constraint: string,
    refTable: string,
    onDelete: string,
  ): Promise<void> {
    const existing: Array<{ conname: string }> = await queryRunner.query(
      `SELECT c.conname
         FROM pg_constraint c
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.contype = 'f' AND c.conrelid = to_regclass(quote_ident($1)) AND a.attname = $2`,
      [table, column],
    );
    for (const { conname } of existing) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${conname}"`);
    }
    await queryRunner.query(
      `ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" FOREIGN KEY ("${column}") REFERENCES "${refTable}"("id") ON DELETE ${onDelete} ON UPDATE NO ACTION`,
    );
  }

  private async columns(queryRunner: QueryRunner, table: string): Promise<Set<string>> {
    const rows: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1`,
      [table],
    );
    return new Set(rows.map((r) => r.column_name));
  }
}
