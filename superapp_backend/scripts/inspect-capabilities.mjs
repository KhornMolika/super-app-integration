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
  const res = await client.query('SELECT key, name, category, "isActive", metadata FROM capability_definitions');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
