import pg from 'pg';
const { Client } = pg;

async function verify() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'admin',
    password: 'admin123',
    database: 'dps_db',
  });

  await client.connect();

  console.log('=== EVIDENCE: POSTGRESQL SCHEMA VERIFICATION ===\n');

  // 1. Check tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  const tableNames = tablesRes.rows.map(r => r.table_name);
  console.log('Total Tables:', tableNames.length);
  console.log('Has capability_definitions:', tableNames.includes('capability_definitions'));
  console.log('Has capability_proposals:', tableNames.includes('capability_proposals'));
  console.log('Has mini_app_collaborators:', tableNames.includes('mini_app_collaborators'));
  console.log('Dropped user_roles:', !tableNames.includes('user_roles'));
  console.log('Dropped miniapp_activities:', !tableNames.includes('miniapp_activities'));

  // 2. Inspect "user" columns
  const userCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'user'
    ORDER BY ordinal_position;
  `);
  console.log('\n--- "user" Table Columns ---');
  userCols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`));

  // 3. Inspect "mini_apps" columns
  const maCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'mini_apps'
    ORDER BY ordinal_position;
  `);
  console.log('\n--- "mini_apps" Table Columns ---');
  maCols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`));

  // 4. Inspect "organizations"
  const orgs = await client.query(`SELECT id, code, name, "parentAuthority" FROM organizations ORDER BY code`);
  console.log('\n--- "organizations" Records (Sample) ---');
  orgs.rows.forEach(o => console.log(`  - [${o.code}] ${o.name} | Parent: ${o.parentAuthority}`));

  // 5. Inspect "audit_logs" columns
  const auditCols = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'audit_logs'
    ORDER BY ordinal_position;
  `);
  console.log('\n--- "audit_logs" Table Columns ---');
  auditCols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

  await client.end();
}

verify().catch(console.error);
