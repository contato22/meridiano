import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { applyMigrations, defaultMigrationsDir } from '../migrate/runner.js';
import * as schema from '../schema/index.js';

export type PgliteDrizzle = ReturnType<typeof drizzle<typeof schema>>;

export interface TestDatabase {
  readonly pg: PGlite;
  readonly db: PgliteDrizzle;
  /**
   * Set the simulated Clerk JWT subject (Clerk user id). RLS policies read this
   * via `current_setting('request.jwt.claim.sub', true)`.
   */
  setClerkUser(clerkUserId: string | null): Promise<void>;
  /**
   * Switch the session to the non-superuser `meridiano_test_app` role so RLS
   * policies actually apply. PGlite defaults to a superuser that bypasses RLS
   * even when `FORCE ROW LEVEL SECURITY` is set.
   */
  asAppRole(): Promise<void>;
  /** Switch back to the default (superuser) role so seeds and admin queries work. */
  asAdminRole(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Spin up a fresh in-memory Postgres (PGlite/WASM), run every migration, and
 * return a Drizzle client + raw PGlite for setting JWT context per test.
 *
 * Tests get full Postgres semantics — triggers, plpgsql, RLS, constraints —
 * without needing Docker or an external Supabase project. This keeps the test
 * suite hermetic and fast enough to run in CI on every PR.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const pg = new PGlite();
  await pg.waitReady;

  await applyMigrations(defaultMigrationsDir(import.meta), {
    exec: async (statement) => {
      await pg.exec(statement);
    },
  });

  // Set up a non-superuser role that does NOT have BYPASSRLS. Test code that
  // wants to exercise RLS should call `tdb.asAppRole()` after seeding; tests
  // that just need raw schema/trigger semantics can stay on the default role.
  await pg.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'meridiano_test_app') THEN
        CREATE ROLE meridiano_test_app NOLOGIN NOBYPASSRLS;
      END IF;
    END
    $$;
    GRANT USAGE ON SCHEMA public TO meridiano_test_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO meridiano_test_app;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO meridiano_test_app;
  `);

  const db = drizzle(pg, { schema });

  return {
    pg,
    db,
    setClerkUser: async (clerkUserId) => {
      if (clerkUserId === null) {
        await pg.exec("SELECT set_config('request.jwt.claim.sub', '', false);");
      } else {
        await pg.query("SELECT set_config('request.jwt.claim.sub', $1, false);", [clerkUserId]);
      }
    },
    asAppRole: async () => {
      await pg.exec('SET ROLE meridiano_test_app;');
    },
    asAdminRole: async () => {
      await pg.exec('RESET ROLE;');
    },
    close: async () => {
      await pg.close();
    },
  };
}
