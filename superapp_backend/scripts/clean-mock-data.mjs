import pg from 'pg';

const client = new pg.Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_DATABASE || 'dps_db',
});

async function main() {
  await client.connect();
  console.log('>>> PURGING OLD RECORDS & MOCK DATA FROM DATABASE <<<\n');

  // 1. Delete mock MiniApps and all related children
  const delBuilds = await client.query('DELETE FROM miniapp_builds');
  console.log(`Deleted ${delBuilds.rowCount} miniapp_builds records.`);

  const delVersions = await client.query('DELETE FROM miniapp_versions');
  console.log(`Deleted ${delVersions.rowCount} miniapp_versions records.`);

  const delLegal = await client.query('DELETE FROM miniapp_legal');
  console.log(`Deleted ${delLegal.rowCount} miniapp_legal records.`);

  const delCollabs = await client.query('DELETE FROM mini_app_collaborators');
  console.log(`Deleted ${delCollabs.rowCount} mini_app_collaborators records.`);

  const delApps = await client.query('DELETE FROM mini_apps');
  console.log(`Deleted ${delApps.rowCount} mock mini_apps records.`);

  // 2. Delete mock capability proposals
  const delProposals = await client.query('DELETE FROM capability_proposals');
  console.log(`Deleted ${delProposals.rowCount} mock capability_proposals records.`);

  // 3. Delete old notifications
  const delNotifs = await client.query('DELETE FROM notification');
  console.log(`Deleted ${delNotifs.rowCount} old notification records.`);

  // 4. Delete old developer tokens
  const delTokens = await client.query('DELETE FROM developer_tokens');
  console.log(`Deleted ${delTokens.rowCount} old developer_tokens records.`);

  // 5. Delete old mobile end-user tokens
  const delRt = await client.query('DELETE FROM end_user_refresh_tokens');
  console.log(`Deleted ${delRt.rowCount} old end_user_refresh_tokens records.`);

  const delEmailTokens = await client.query('DELETE FROM end_user_email_verification_tokens');
  console.log(`Deleted ${delEmailTokens.rowCount} old end_user_email_verification_tokens records.`);

  // 6. Delete legacy mock 'microphone' from capability_definitions
  const delMic = await client.query(`DELETE FROM capability_definitions WHERE key = 'microphone' AND (metadata->>'source' IS NULL OR metadata->>'source' != 'gitlab:main')`);
  console.log(`Deleted ${delMic.rowCount} legacy mock capability definition (microphone).`);

  // 7. Clean old mock audit logs and insert clean Master Plan initialization audit log
  const delAudit = await client.query('DELETE FROM audit_logs');
  console.log(`Deleted ${delAudit.rowCount} old audit_logs records.`);

  const superAdmin = await client.query(`SELECT id, name, email FROM "user" WHERE email = 'molikakhorn71@gmail.com'`);
  const adminUser = superAdmin.rows[0];

  if (adminUser) {
    await client.query(`
      INSERT INTO audit_logs (id, "actorId", "actorName", "actorEmail", "actorRole", action, "resourceType", "resourceId", metadata, "ipAddress", "userAgent", "createdAt")
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        'SUPER_ADMIN',
        'SYSTEM_MASTER_PLAN_INITIALIZED',
        'PLATFORM',
        'fsa-superapp-ecosystem',
        '{"event": "FSA SuperApp Master Plan Database Initialized", "cleanSeed": true, "environment": "production"}'::jsonb,
        '127.0.0.1',
        'FSA Platform Master Plan Seeder',
        NOW()
      )
    `, [adminUser.id, adminUser.name, adminUser.email]);
    console.log('Inserted clean platform initialization audit log.');
  }

  console.log('\n>>> Database cleanup completed successfully! <<<');
  await client.end();
}

main().catch((err) => {
  console.error('Cleanup Error:', err);
  process.exit(1);
});
