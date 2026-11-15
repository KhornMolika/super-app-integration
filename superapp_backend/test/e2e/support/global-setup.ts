/**
 * Creates the e2e database from nothing before the run. The first app boot
 * then applies every migration (migrationsRun), so the run also proves the
 * whole migration chain on an empty database.
 */
import { Client } from 'pg';
import './env';
import { E2E_DB } from './env';

export default async function globalSetup(): Promise<void> {
  if (!/^[a-z0-9_]+$/.test(E2E_DB) || !E2E_DB.includes('e2e')) {
    // Never drop a database that is not obviously the test one
    throw new Error(
      `Refusing to reset database "${E2E_DB}": its name must contain "e2e"`,
    );
  }
  const admin = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${E2E_DB}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${E2E_DB}"`);
  } finally {
    await admin.end();
  }
  const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: E2E_DB,
  });
  await db.connect();
  // InitialSchema uses uuid_generate_v4()
  await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await db.end();
}
