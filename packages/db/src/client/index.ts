import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema/index.js';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let cached: Database | null = null;

/**
 * Returns a singleton Drizzle client wired to `DATABASE_URL`. Server-only —
 * the `server-only` import guard ensures this module is never bundled into
 * client-side JavaScript, which would leak the connection string.
 */
export function getDatabase(): Database {
  if (cached) return cached;
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  // postgres-js handles pooling internally; we keep max=10 for serverless
  // edge runtimes where each instance maintains a small pool.
  const client = postgres(url, { max: 10, prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}
