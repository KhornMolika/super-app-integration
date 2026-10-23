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
  console.log('=== CURRENT MINI_APPS ===');
  const apps = await client.query('SELECT id, "appId", name, "organizationId", "lifecycleStatus" FROM mini_apps');
  for (const a of apps.rows) {
    console.log(`- [${a.appId}] ${a.name} (Org: ${a.organizationId}, Status: ${a.lifecycleStatus})`);
  }

  console.log('\n=== CURRENT CAPABILITY PROPOSALS ===');
  const props = await client.query('SELECT id, "capabilityKey", "capabilityName", status FROM capability_proposals');
  for (const p of props.rows) {
    console.log(`- [${p.capabilityKey}] ${p.capabilityName} (Status: ${p.status})`);
  }

  await client.end();
}

main().catch(console.error);
