import pg from 'pg';
const { Client } = pg;

async function check() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'admin',
    password: 'admin123',
    database: 'dps_db',
  });

  await client.connect();

  const users = await client.query('SELECT id, email, name FROM "user"');
  console.log(`Users in DB (${users.rows.length}):`);
  users.rows.forEach(u => console.log(`  - ${u.id}: ${u.email} (${u.name})`));

  const orgs = await client.query('SELECT id, code, name FROM organizations');
  console.log(`Organizations in DB (${orgs.rows.length}):`);
  orgs.rows.forEach(o => console.log(`  - [${o.code}] ${o.name} (${o.id})`));

  const apps = await client.query('SELECT id, "appId", name, status FROM mini_apps');
  console.log(`MiniApps in DB (${apps.rows.length}):`);
  apps.rows.forEach(a => console.log(`  - [${a.appId}] ${a.name} (status: ${a.status})`));

  await client.end();
}

check().catch(console.error);
