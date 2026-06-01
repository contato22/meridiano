/**
 * CLI: pnpm db:seed
 * Seeds the AWQ Group demo data into the database identified by DATABASE_URL.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema/index.js';
import { seedAwqGroup } from './awq.js';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql, { schema });
try {
  await seedAwqGroup(db);
  console.log('AWQ Group seed applied.');
} finally {
  await sql.end();
}
