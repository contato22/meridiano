/**
 * CLI: pnpm db:migrate
 *
 * Applies every SQL migration in `migrations/` to the database identified by
 * `DATABASE_URL`. Intended for dev/staging — production migrations go through
 * drizzle-kit (with its proper tracking table) once we wire that up in PR-F.
 */
import postgres from 'postgres';
import { applyMigrations, defaultMigrationsDir } from './runner.js';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  const applied = await applyMigrations(defaultMigrationsDir(import.meta), {
    exec: async (statement) => {
      await sql.unsafe(statement);
    },
  });
  console.log(`Applied ${String(applied.length)} migration(s):`);
  for (const m of applied) console.log(`  ${m.name}`);
} finally {
  await sql.end();
}
