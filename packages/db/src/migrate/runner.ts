import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export interface MigrationExecutor {
  exec(sql: string): Promise<void>;
}

export interface Migration {
  readonly name: string;
  readonly sql: string;
}

/**
 * Reads every `.sql` file in the migrations directory, sorted lexicographically
 * (so the `0001_`, `0002_` ... prefixing controls ordering), and applies each
 * file as a single statement batch via the given executor.
 *
 * Idempotency / tracking is the responsibility of the caller — for PGlite tests
 * we always run on a fresh in-memory DB; production runs use drizzle-kit which
 * has its own tracking table.
 */
export async function applyMigrations(
  migrationsDir: string,
  executor: MigrationExecutor,
): Promise<readonly Migration[]> {
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const applied: Migration[] = [];
  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await executor.exec(sql);
    applied.push({ name: file, sql });
  }
  return applied;
}

/**
 * Resolves `@meridiano/db`'s `migrations/` directory. Looks up from THIS
 * source file's location so callers from other packages (e.g. infrastructure
 * tests) get the same path. Works whether this module is imported from
 * `src/` or the built `dist/` output.
 *
 * The optional `meta` parameter is ignored — kept for back-compat with the
 * previous API that took the caller's `import.meta`.
 */
export function defaultMigrationsDir(_meta?: { url: string }): string {
  const here = new URL(import.meta.url).pathname;
  let cur = path.dirname(here);
  while (cur !== '/' && path.basename(cur) !== 'db') {
    cur = path.dirname(cur);
  }
  return path.join(cur, 'migrations');
}
