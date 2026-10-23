import pg from 'pg';

const client = new pg.Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'admin',
  password: 'admin123',
  database: 'dps_db',
});

async function main() {
  await client.connect();
  const tables = [
    'user',
    'role',
    'role_permissions',
    'permission',
    'organizations',
    'mini_apps',
    'mini_app_collaborators',
    'miniapp_versions',
    'miniapp_builds',
    'miniapp_legal',
    'miniapp_issues',
    'capability_definitions',
    'capability_proposals',
    'audit_logs',
    'notification',
    'developer_tokens',
    'end_user',
    'end_user_refresh_tokens',
    'end_user_email_verification_tokens',
    'super_app_capabilities',
  ];

  console.log('=== TABLE RECORD COUNTS IN DPS_DB ===\n');
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT count(*) FROM "${t}"`);
      console.log(`  - ${t}: ${res.rows[0].count} records`);
    } catch (e) {
      console.log(`  - ${t}: Table query error (${e.message})`);
    }
  }
  await client.end();
}

main().catch(console.error);
