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

const N = 1 << 15; // 32768
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

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

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LEN);
  const key = await scryptAsync(password, salt, KEY_LEN, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function main() {
  await client.connect();
  console.log('>>> Applying Master Plan Seeds to Live Database <<<\n');

  // 1. Remove redundant roles (MINI_APP_MANAGER)
  await client.query(`DELETE FROM role_permissions WHERE "roleId" IN (SELECT id FROM role WHERE name = 'MINI_APP_MANAGER')`);
  await client.query(`DELETE FROM role WHERE name = 'MINI_APP_MANAGER'`);
  console.log('Purged legacy MINI_APP_MANAGER role.');

  // 2. Fetch roles
  const superAdminRoleRes = await client.query(`SELECT id FROM role WHERE name = 'SUPER_ADMIN'`);
  const adminRoleRes = await client.query(`SELECT id FROM role WHERE name = 'ADMIN'`);
  const superAdminRoleId = superAdminRoleRes.rows[0]?.id;
  const adminRoleId = adminRoleRes.rows[0]?.id;

  // 3. Fetch FTC organization
  const ftcOrgRes = await client.query(`SELECT id FROM organizations WHERE code = 'FTC'`);
  const ftcOrgId = ftcOrgRes.rows[0]?.id;

  // 4. Compute Password123!@# Hash
  const passwordHash = await hashPassword('Password123!@#');

  // 5. Reassign references from any other test users to molikakhorn71@gmail.com
  const primaryAdminRes = await client.query(`SELECT id FROM "user" WHERE email = 'molikakhorn71@gmail.com'`);
  const primaryAdminId = primaryAdminRes.rows[0]?.id;

  const testUsers = await client.query(`
    SELECT id, email FROM "user" 
    WHERE email NOT IN (
      'molikakhorn71@gmail.com',
      'thavorac.chun@gmail.com',
      'sea.hutmonineat@gmail.com',
      'lymoly1122@gmail.com'
    )
  `);

  if (testUsers.rows.length > 0 && primaryAdminId) {
    const testIds = testUsers.rows.map(r => r.id);
    console.log(`Reassigning references for ${testUsers.rows.length} test user(s)...`);
    await client.query(`UPDATE mini_apps SET "ownerId" = $1 WHERE "ownerId" = ANY($2)`, [primaryAdminId, testIds]).catch(() => {});
    await client.query(`UPDATE capability_proposals SET "requestedById" = $1 WHERE "requestedById" = ANY($2)`, [primaryAdminId, testIds]).catch(() => {});
    await client.query(`UPDATE notification SET "userId" = $1 WHERE "userId" = ANY($2)`, [primaryAdminId, testIds]).catch(() => {});
    await client.query(`UPDATE developer_tokens SET "userId" = $1 WHERE "userId" = ANY($2)`, [primaryAdminId, testIds]).catch(() => {});
    await client.query(`UPDATE mini_app_collaborators SET "userId" = $1 WHERE "userId" = ANY($2)`, [primaryAdminId, testIds]).catch(() => {});
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [testIds]);
    console.log(`Purged non-official users: ${testUsers.rows.map(r => r.email).join(', ')}`);
  }

  // 6. Update Official Accounts
  const officialAccounts = [
    { email: 'molikakhorn71@gmail.com', name: 'Molika Khorn', roleId: superAdminRoleId },
    { email: 'thavorac.chun@gmail.com', name: 'Thavorac Chun', roleId: superAdminRoleId },
    { email: 'sea.hutmonineat@gmail.com', name: 'Hutmonineat Sea', roleId: superAdminRoleId },
    { email: 'lymoly1122@gmail.com', name: 'Moly Ly', roleId: adminRoleId },
  ];

  for (const acc of officialAccounts) {
    await client.query(`
      UPDATE "user" 
      SET 
        name = $1,
        "roleId" = $2,
        "organizationId" = $3,
        "passwordHash" = $4,
        status = 'ACTIVE'
      WHERE LOWER(TRIM(email)) = $5
    `, [acc.name, acc.roleId, ftcOrgId, passwordHash, acc.email]);
    console.log(`Synchronized account: ${acc.email} (${acc.name}) with Password123!@#`);
  }

  console.log('\n>>> All seeds successfully applied! <<<');
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
