import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../../src/testing/index.js';

let tdb: TestDatabase;

beforeAll(async () => {
  tdb = await createTestDatabase();
});

afterAll(async () => {
  await tdb.close();
});

describe('migrations', () => {
  it('creates the expected set of tables', async () => {
    const result = await tdb.pg.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    const names = result.rows.map((r) => r.table_name);
    expect(names).toContain('organizations');
    expect(names).toContain('workspaces');
    expect(names).toContain('users');
    expect(names).toContain('memberships');
    expect(names).toContain('entities');
    expect(names).toContain('accounts');
    expect(names).toContain('transactions');
    expect(names).toContain('entries');
    expect(names).toContain('account_balances');
  });

  it('enables row-level security on every multi-tenant table', async () => {
    const result = await tdb.pg.query<{ tablename: string; rowsecurity: boolean }>(
      `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`,
    );
    const expected = [
      'organizations',
      'workspaces',
      'users',
      'memberships',
      'entities',
      'accounts',
      'transactions',
      'entries',
      'account_balances',
    ];
    for (const t of expected) {
      const row = result.rows.find((r) => r.tablename === t);
      expect(row, `table ${t}`).toBeDefined();
      expect(row?.rowsecurity, `RLS on ${t}`).toBe(true);
    }
  });

  it('installs the auth_user_org_id helper function', async () => {
    const result = await tdb.pg.query<{ proname: string }>(
      `SELECT proname FROM pg_proc WHERE proname = 'auth_user_org_id'`,
    );
    expect(result.rows).toHaveLength(1);
  });
});
