import pg from 'pg';
const { Client } = pg;

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_DATABASE || 'dps_db',
  });

  await client.connect();
  console.log('Connected to PostgreSQL database:', client.database);

  try {
    await client.query('BEGIN');

    console.log('--- Step 1: Migrating organizations ---');
    // Ensure parentAuthority exists
    await client.query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS "parentAuthority" VARCHAR(255) DEFAULT 'Non-Bank Financial Services Authority';
    `);

    // Clean organization names (remove acronym in parentheses)
    const cleanOrgNames = [
      { code: 'FTC', name: 'Financial Technology Center' },
      { code: 'GAD', name: 'General Affairs Department' },
      { code: 'PD', name: 'Policy Department' },
      { code: 'TLAD', name: 'Technical and Legal Affairs Department' },
      { code: 'IRC', name: 'Insurance Regulator of Cambodia' },
      { code: 'SERC', name: 'Securities and Exchange Regulator of Cambodia' },
      { code: 'SSR', name: 'Social Security Regulator' },
      { code: 'TR', name: 'Trust Regulator' },
      { code: 'ACAR', name: 'Accounting and Auditing Regulator' },
      { code: 'RPR', name: 'Real Estate Business and Pawnshop Regulator' },
      { code: 'IAU', name: 'Internal Audit Unit' },
    ];

    for (const org of cleanOrgNames) {
      await client.query(
        `UPDATE organizations SET name = $1, "parentAuthority" = 'Non-Bank Financial Services Authority' WHERE code = $2`,
        [org.name, org.code]
      );
    }

    // Drop redundant columns from organizations
    await client.query(`
      ALTER TABLE organizations 
      DROP COLUMN IF EXISTS "domain",
      DROP COLUMN IF EXISTS "contactEmail",
      DROP COLUMN IF EXISTS "contactPhone",
      DROP COLUMN IF EXISTS "metadata";
    `);

    console.log('--- Step 2: Migrating user (1 User = 1 Role & Agency Scope) ---');
    await client.query(`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS "roleId" UUID REFERENCES "role"("id") ON DELETE RESTRICT,
      ADD COLUMN IF NOT EXISTS "organizationId" UUID REFERENCES "organizations"("id") ON DELETE SET NULL;
    `);

    // Get FTC org ID for default user assignment
    const ftcRes = await client.query(`SELECT id FROM organizations WHERE code = 'FTC' LIMIT 1`);
    const ftcId = ftcRes.rows[0]?.id;

    // Backfill roleId from user_roles if user_roles exists
    const hasUserRoles = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles'
    `);
    if (hasUserRoles.rows.length > 0) {
      const userRolesRes = await client.query(`
        SELECT ur."userId", r.id as "roleId", r.name as "roleName"
        FROM user_roles ur
        JOIN role r ON r.id = ur."roleId"
      `);

      // Priority map for highest role
      const priority = { SUPER_ADMIN: 3, ADMIN: 2, MA_DEVELOPER: 1 };
      const userHighestRole = new Map();

      for (const row of userRolesRes.rows) {
        const current = userHighestRole.get(row.userId);
        const pCurrent = current ? (priority[current.roleName] || 0) : -1;
        const pNew = priority[row.roleName] || 0;
        if (pNew > pCurrent) {
          userHighestRole.set(row.userId, row);
        }
      }

      for (const [userId, roleData] of userHighestRole.entries()) {
        await client.query(
          `UPDATE "user" SET "roleId" = $1 WHERE id = $2 AND "roleId" IS NULL`,
          [roleData.roleId, userId]
        );
      }
    }

    // Fallback: assign remaining users with no role to MA_DEVELOPER or SUPER_ADMIN
    const superAdminRoleRes = await client.query(`SELECT id FROM role WHERE name = 'SUPER_ADMIN' LIMIT 1`);
    const devRoleRes = await client.query(`SELECT id FROM role WHERE name = 'MA_DEVELOPER' LIMIT 1`);
    const defaultRoleId = devRoleRes.rows[0]?.id || superAdminRoleRes.rows[0]?.id;

    if (defaultRoleId) {
      await client.query(`UPDATE "user" SET "roleId" = $1 WHERE "roleId" IS NULL`, [defaultRoleId]);
    }

    // Set roleId NOT NULL
    await client.query(`ALTER TABLE "user" ALTER COLUMN "roleId" SET NOT NULL;`);

    // Assign official accounts to FTC organization
    if (ftcId) {
      await client.query(
        `UPDATE "user" SET "organizationId" = $1 WHERE "organizationId" IS NULL AND email IN (
          'molikakhorn71@gmail.com',
          'thavorac.chun@gmail.com',
          'sea.hutmonineat@gmail.com',
          'lymoly1122@gmail.com'
        )`,
        [ftcId]
      );
    }

    // Drop redundant columns from user and drop user_roles junction
    await client.query(`
      ALTER TABLE "user" 
      DROP COLUMN IF EXISTS "isActive",
      DROP COLUMN IF EXISTS "teamTelegramChatId";
    `);
    await client.query(`DROP TABLE IF EXISTS "user_roles" CASCADE;`);

    console.log('--- Step 3: Migrating mini_apps ---');
    // Add new columns to mini_apps
    await client.query(`
      ALTER TABLE mini_apps 
      ADD COLUMN IF NOT EXISTS "organizationId" UUID REFERENCES organizations(id) ON DELETE RESTRICT,
      ADD COLUMN IF NOT EXISTS "sharingScope" VARCHAR(50) NOT NULL DEFAULT 'PRIVATE',
      ADD COLUMN IF NOT EXISTS "lifecycleStatus" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      ADD COLUMN IF NOT EXISTS "availabilityStatus" VARCHAR(50) NOT NULL DEFAULT 'ENABLED';
    `);

    // Backfill organizationId from organizationCode or default to FTC
    if (ftcId) {
      await client.query(`
        UPDATE mini_apps ma
        SET "organizationId" = COALESCE(o.id, $1)
        FROM (SELECT id, code FROM organizations) o
        WHERE ma."organizationCode" = o.code AND ma."organizationId" IS NULL;
      `, [ftcId]);

      await client.query(`
        UPDATE mini_apps SET "organizationId" = $1 WHERE "organizationId" IS NULL;
      `, [ftcId]);
    }

    await client.query(`ALTER TABLE mini_apps ALTER COLUMN "organizationId" SET NOT NULL;`);

    // Rename columns if old column names exist
    const checkColumns = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'mini_apps'
    `);
    const colNames = checkColumns.rows.map(r => r.column_name);

    if (colNames.includes('shortDescription') && !colNames.includes('tagline')) {
      await client.query(`ALTER TABLE mini_apps RENAME COLUMN "shortDescription" TO "tagline";`);
    }
    if (colNames.includes('fullDescription') && !colNames.includes('description')) {
      await client.query(`ALTER TABLE mini_apps RENAME COLUMN "fullDescription" TO "description";`);
    }
    if (colNames.includes('teamTelegramChatId') && !colNames.includes('alertTelegramChatId')) {
      await client.query(`ALTER TABLE mini_apps RENAME COLUMN "teamTelegramChatId" TO "alertTelegramChatId";`);
    }
    if (colNames.includes('permissions') && !colNames.includes('capabilities')) {
      await client.query(`ALTER TABLE mini_apps RENAME COLUMN "permissions" TO "capabilities";`);
    }

    // Backfill lifecycleStatus from legacy status
    if (colNames.includes('status')) {
      await client.query(`
        UPDATE mini_apps SET "lifecycleStatus" = 
          CASE 
            WHEN status = 'ACTIVE' THEN 'ACTIVE'
            WHEN status = 'ARCHIVED' THEN 'ARCHIVED'
            WHEN status = 'DEPRECATED' THEN 'DEPRECATED'
            ELSE 'DRAFT'
          END;
      `);
      await client.query(`
        UPDATE mini_apps SET "availabilityStatus" = 'SUSPENDED' WHERE status = 'SUSPENDED';
      `);
    }

    // Drop prototype / redundant columns from mini_apps
    await client.query(`
      ALTER TABLE mini_apps 
      DROP COLUMN IF EXISTS "teamName",
      DROP COLUMN IF EXISTS "version",
      DROP COLUMN IF EXISTS "organization",
      DROP COLUMN IF EXISTS "organizationCode",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "buildStatus",
      DROP COLUMN IF EXISTS "buildStages",
      DROP COLUMN IF EXISTS "buildError",
      DROP COLUMN IF EXISTS "validationStatus",
      DROP COLUMN IF EXISTS "validationStages",
      DROP COLUMN IF EXISTS "validationReport",
      DROP COLUMN IF EXISTS "validationErrors";
    `);

    console.log('--- Step 4: Creating mini_app_collaborators ---');
    await client.query(`
      CREATE TABLE IF NOT EXISTS mini_app_collaborators (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "miniAppId" UUID NOT NULL REFERENCES mini_apps(id) ON DELETE CASCADE,
        "userId" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'COLLABORATOR',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_mini_app_collaborator_app_user" UNIQUE ("miniAppId", "userId")
      );
    `);

    console.log('--- Step 5: Migrating Capability Definitions & Proposals ---');
    // Check if permission_definitions exists and capability_definitions does not
    const hasPermDefs = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_definitions'
    `);
    const hasCapDefs = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'capability_definitions'
    `);
    if (hasPermDefs.rows.length > 0 && hasCapDefs.rows.length === 0) {
      await client.query(`ALTER TABLE permission_definitions RENAME TO capability_definitions;`);
    }

    // Check if permission_proposals exists and capability_proposals does not
    const hasPermProps = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_proposals'
    `);
    const hasCapProps = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'capability_proposals'
    `);
    if (hasPermProps.rows.length > 0 && hasCapProps.rows.length === 0) {
      await client.query(`ALTER TABLE permission_proposals RENAME TO capability_proposals;`);
    }

    // Rename columns inside capability_proposals if needed
    const capPropCols = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'capability_proposals'
    `);
    const cpNames = capPropCols.rows.map(r => r.column_name);
    if (cpNames.includes('permissionKey') && !cpNames.includes('capabilityKey')) {
      await client.query(`ALTER TABLE capability_proposals RENAME COLUMN "permissionKey" TO "capabilityKey";`);
    }
    if (cpNames.includes('permissionName') && !cpNames.includes('capabilityName')) {
      await client.query(`ALTER TABLE capability_proposals RENAME COLUMN "permissionName" TO "capabilityName";`);
    }

    console.log('--- Step 6: Upgrading audit_logs & Dropping miniapp_activities ---');
    await client.query(`
      ALTER TABLE audit_logs 
      ADD COLUMN IF NOT EXISTS "actorName" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "actorEmail" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "actorRole" VARCHAR(50);
    `);
    await client.query(`DROP TABLE IF EXISTS "miniapp_activities" CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS "mini_app_activities" CASCADE;`);

    console.log('--- Step 7: Upgrading miniapp_builds ---');
    await client.query(`
      ALTER TABLE miniapp_builds 
      ADD COLUMN IF NOT EXISTS "versionId" UUID REFERENCES miniapp_versions(id) ON DELETE CASCADE;
    `);

    console.log('--- Step 8: Upgrading end_user_refresh_tokens ---');
    const refreshCols = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'end_user_refresh_tokens'
    `);
    const refNames = refreshCols.rows.map(r => r.column_name);
    if (refNames.includes('userId') && !refNames.includes('endUserId')) {
      await client.query(`ALTER TABLE end_user_refresh_tokens RENAME COLUMN "userId" TO "endUserId";`);
    }

    console.log('--- Step 9: Upgrading developer_tokens ---');
    await client.query(`
      ALTER TABLE developer_tokens 
      ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMPTZ;
    `);

    console.log('--- Step 10: Dropping type from miniapp_versions ---');
    await client.query(`
      ALTER TABLE miniapp_versions 
      DROP COLUMN IF EXISTS "type";
    `);

    await client.query('COMMIT');
    console.log('>>> Migration successfully committed! <<<');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back! Error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);
