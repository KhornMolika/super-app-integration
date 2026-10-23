import pg from 'pg';
import * as crypto from 'crypto';

const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_DATABASE || 'dps_db',
});

function scryptAsync(password, salt, keylen, n, r, p) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password.normalize('NFKC'),
      salt,
      keylen,
      { N: n, r, p, maxmem: 128 * n * r * p + 16 * 1024 * 1024 },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

async function verifyPassword(password, stored) {
  if (!password || !stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return password === stored;
  }
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  try {
    const actual = await scryptAsync(password, salt, expected.length, n, r, p);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function main() {
  await client.connect();
  console.log('=== VERIFYING SEEDED DATABASE STATE ===\n');

  // 1. Organizations Check
  const orgs = await client.query(
    `SELECT id, name, code, "parentAuthority", status FROM organizations ORDER BY code ASC`
  );
  console.log(`--- Organizations (${orgs.rows.length}) ---`);
  for (const o of orgs.rows) {
    console.log(`  [${o.code}] ${o.name} | Parent: ${o.parentAuthority}`);
  }

  // 2. Roles Check
  const roles = await client.query(`SELECT id, name, description FROM role ORDER BY name ASC`);
  console.log(`\n--- Roles (${roles.rows.length}) ---`);
  for (const r of roles.rows) {
    console.log(`  - ${r.name}: ${r.description}`);
  }

  // 3. Official Accounts Check
  const users = await client.query(`
    SELECT u.id, u.email, u.name, u.status, u."passwordHash", r.name as role_name, o.name as org_name, o.code as org_code
    FROM "user" u
    LEFT JOIN role r ON r.id = u."roleId"
    LEFT JOIN organizations o ON o.id = u."organizationId"
    ORDER BY u.email ASC
  `);
  console.log(`\n--- Users (${users.rows.length}) ---`);
  for (const u of users.rows) {
    let passwordValid = false;
    if (u.passwordHash) {
      passwordValid = await verifyPassword('Password123!@#', u.passwordHash);
    }
    console.log(`  - ${u.email} | ${u.name} | Role: ${u.role_name} | Org: [${u.org_code}] ${u.org_name} | Password matches: ${passwordValid}`);
  }

  // 4. Mock Accounts Check
  const mockUsers = await client.query(`
    SELECT count(*) FROM "user" 
    WHERE email LIKE '%@superapp.gov.kh' OR email LIKE '%@example.com'
  `);
  console.log(`\nMock Users Remaining: ${mockUsers.rows[0].count} (Expected: 0)`);

  // 5. Capability Definitions Check
  const caps = await client.query(`
    SELECT key, name, category, "isActive" FROM capability_definitions ORDER BY key ASC
  `);
  console.log(`\n--- Capability Definitions (${caps.rows.length}) ---`);
  for (const c of caps.rows) {
    console.log(`  - ${c.key} (${c.name}) [${c.category}] Active: ${c.isActive}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
