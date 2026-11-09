/**
 * Standalone Transactional Migration Script: Legacy Users/EndUsers -> Identities + Profiles
 * 
 * Usage:
 *   node scripts/migrate-to-identities-schema.mjs
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to load env files safely
function loadEnv() {
  const root = resolve(__dirname, '..');
  const envFiles = [
    resolve(root, `.env.${process.env.NODE_ENV || 'development'}`),
    resolve(root, '.env'),
  ];

  for (const envFile of envFiles) {
    if (existsSync(envFile)) {
      const content = readFileSync(envFile, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const client = new pg.Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'superapp_db',
});

async function run() {
  console.log('🔄 Connecting to PostgreSQL database...');
  await client.connect();
  console.log(`✅ Connected to ${process.env.DB_DATABASE || 'superapp_db'} on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);

  try {
    await client.query('BEGIN');
    console.log('🚀 Transaction started...');

    // 1. Create identities table
    console.log('1️⃣ Creating "identities" table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "identities" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "email" VARCHAR NOT NULL,
        "name" VARCHAR NOT NULL,
        "honorific" VARCHAR NULL,
        "avatarKey" VARCHAR NULL,
        "avatarUpdatedAt" TIMESTAMPTZ NULL,
        "passwordHash" VARCHAR NOT NULL,
        "status" VARCHAR NOT NULL DEFAULT 'ACTIVE',
        "emailVerifiedAt" TIMESTAMPTZ NULL,
        "failedLoginCount" INT NOT NULL DEFAULT 0,
        "lockedUntil" TIMESTAMPTZ NULL,
        "sessionsRevokedAt" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_identities_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_identities_email" UNIQUE ("email"),
        CONSTRAINT "CHK_identities_email_lowercase" CHECK ("email" = lower("email"))
      );
    `);

    // 2. Create staff_profiles table
    console.log('2️⃣ Creating "staff_profiles" table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "staff_profiles" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "identityId" UUID NOT NULL,
        "organizationId" UUID NOT NULL,
        "roleId" UUID NOT NULL,
        "staffId" VARCHAR(50) NULL,
        "position" VARCHAR(100) NULL,
        "phoneNumber" VARCHAR(30) NULL,
        "externalId" VARCHAR(100) NULL,
        "status" VARCHAR NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_staff_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_staff_profiles_identityId" UNIQUE ("identityId"),
        CONSTRAINT "FK_staff_profiles_identity" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_staff_profiles_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_staff_profiles_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT
      );
    `);

    // 3. Create consumer_profiles table
    console.log('3️⃣ Creating "consumer_profiles" table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "consumer_profiles" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "identityId" UUID NOT NULL,
        "phoneNumber" VARCHAR(30) NULL,
        "deletionRequestedAt" TIMESTAMPTZ NULL,
        "purgeAfter" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_consumer_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_consumer_profiles_identityId" UNIQUE ("identityId"),
        CONSTRAINT "FK_consumer_profiles_identity" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE
      );
    `);

    // 4. Add targetAudience to mini_apps
    console.log('4️⃣ Ensuring "mini_apps.targetAudience" column exists...');
    await client.query(`
      ALTER TABLE "mini_apps" ADD COLUMN IF NOT EXISTS "targetAudience" VARCHAR(50) NOT NULL DEFAULT 'PUBLIC';
    `);

    // 5. Migrate users -> identities & staff_profiles
    const checkUsers = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    if (checkUsers.rows[0].exists) {
      console.log('5️⃣ Migrating legacy "users" to "identities" and "staff_profiles"...');
      const resIdentities = await client.query(`
        INSERT INTO "identities" ("id", "email", "name", "passwordHash", "status", "failedLoginCount", "lockedUntil", "createdAt", "updatedAt")
        SELECT 
          u."id",
          lower(trim(u."email")),
          u."name",
          COALESCE(u."passwordHash", ''),
          COALESCE(u."status", 'ACTIVE'),
          0,
          NULL,
          COALESCE(u."createdAt", NOW()),
          COALESCE(u."updatedAt", NOW())
        FROM "users" u
        ON CONFLICT ("email") DO NOTHING;
      `);
      console.log(`   ↳ Migrated/Ensured identities from users: ${resIdentities.rowCount || 0}`);

      const resStaff = await client.query(`
        INSERT INTO "staff_profiles" ("identityId", "organizationId", "roleId", "staffId", "position", "phoneNumber", "externalId", "status", "createdAt", "updatedAt")
        SELECT 
          i."id",
          u."organizationId",
          u."roleId",
          u."staffId",
          u."position",
          u."phoneNumber",
          u."externalId",
          'ACTIVE',
          COALESCE(u."createdAt", NOW()),
          COALESCE(u."updatedAt", NOW())
        FROM "users" u
        JOIN "identities" i ON lower(trim(u."email")) = i."email"
        WHERE u."organizationId" IS NOT NULL AND u."roleId" IS NOT NULL
        ON CONFLICT ("identityId") DO NOTHING;
      `);
      console.log(`   ↳ Created staff_profiles: ${resStaff.rowCount || 0}`);
    }

    // 6. Migrate end_users -> identities & consumer_profiles
    const checkEndUsers = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'end_users'
      );
    `);

    if (checkEndUsers.rows[0].exists) {
      console.log('6️⃣ Migrating legacy "end_users" to "identities" and "consumer_profiles"...');
      const resEndIdentities = await client.query(`
        INSERT INTO "identities" ("id", "email", "name", "passwordHash", "status", "emailVerifiedAt", "failedLoginCount", "lockedUntil", "sessionsRevokedAt", "createdAt", "updatedAt")
        SELECT 
          eu."id",
          lower(trim(eu."email")),
          eu."name",
          eu."passwordHash",
          COALESCE(eu."status", 'ACTIVE'),
          eu."emailVerifiedAt",
          COALESCE(eu."failedLoginCount", 0),
          eu."lockedUntil",
          eu."sessionsRevokedAt",
          COALESCE(eu."createdAt", NOW()),
          COALESCE(eu."updatedAt", NOW())
        FROM "end_users" eu
        ON CONFLICT ("email") DO UPDATE SET
          "emailVerifiedAt" = COALESCE("identities"."emailVerifiedAt", EXCLUDED."emailVerifiedAt"),
          "sessionsRevokedAt" = COALESCE("identities"."sessionsRevokedAt", EXCLUDED."sessionsRevokedAt");
      `);
      console.log(`   ↳ Migrated/Merged identities from end_users: ${resEndIdentities.rowCount || 0}`);

      const resConsumer = await client.query(`
        INSERT INTO "consumer_profiles" ("identityId", "phoneNumber", "deletionRequestedAt", "purgeAfter", "createdAt", "updatedAt")
        SELECT 
          i."id",
          eu."phoneNumber",
          eu."deletionRequestedAt",
          eu."purgeAfter",
          COALESCE(eu."createdAt", NOW()),
          COALESCE(eu."updatedAt", NOW())
        FROM "end_users" eu
        JOIN "identities" i ON lower(trim(eu."email")) = i."email"
        ON CONFLICT ("identityId") DO NOTHING;
      `);
      console.log(`   ↳ Created consumer_profiles: ${resConsumer.rowCount || 0}`);
    }

    await client.query('COMMIT');
    console.log('🎉 Migration transaction successfully committed!\n');

    // Print summary stats
    const statsIdentities = await client.query('SELECT count(*) FROM "identities"');
    const statsStaff = await client.query('SELECT count(*) FROM "staff_profiles"');
    const statsConsumer = await client.query('SELECT count(*) FROM "consumer_profiles"');
    const statsDual = await client.query(`
      SELECT count(*) FROM "identities" i
      JOIN "staff_profiles" s ON s."identityId" = i."id"
      JOIN "consumer_profiles" c ON c."identityId" = i."id";
    `);

    console.log('📊 Migration Summary Statistics:');
    console.log(`   • Total Master Identities:    ${statsIdentities.rows[0].count}`);
    console.log(`   • Total Staff Profiles:       ${statsStaff.rows[0].count}`);
    console.log(`   • Total Consumer Profiles:    ${statsConsumer.rows[0].count}`);
    console.log(`   • Dual-Role Merged Users:     ${statsDual.rows[0].count}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, transaction rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
