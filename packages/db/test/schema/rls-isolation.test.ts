import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../../src/testing/index.js';

/**
 * RLS policy *creation* is verified here. End-to-end isolation testing
 * (a non-superuser session being filtered to its own org) needs a real
 * PostgreSQL instance — PGlite's WASM build crashes on `SET ROLE`, so we
 * can't switch off the default superuser inside this harness. That side of
 * the verification will land in PR-F against a Supabase staging project
 * (or, alternatively, a CI service container).
 *
 * For Sprint 1 PR-B, schema integrity + auth helper functions are tested
 * here; the policies themselves are reviewed at PR time.
 */

let tdb: TestDatabase;

beforeAll(async () => {
  tdb = await createTestDatabase();
});

afterAll(async () => {
  await tdb.close();
});

describe('RLS — policy installation', () => {
  it('every multi-tenant table has at least one policy', async () => {
    const result = await tdb.pg.query<{ tablename: string; policy_count: string }>(
      `SELECT tablename, COUNT(*)::text AS policy_count
         FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename`,
    );
    const counts = new Map(result.rows.map((r) => [r.tablename, Number(r.policy_count)]));
    for (const t of [
      'organizations',
      'workspaces',
      'memberships',
      'entities',
      'accounts',
      'transactions',
      'entries',
      'account_balances',
      'users',
    ]) {
      expect(counts.get(t) ?? 0, `policies on ${t}`).toBeGreaterThan(0);
    }
  });

  it('FORCE ROW LEVEL SECURITY is set on every secured table', async () => {
    const result = await tdb.pg.query<{ relname: string; relforcerowsecurity: boolean }>(
      `SELECT relname, relforcerowsecurity
         FROM pg_class
        WHERE relname IN (
          'organizations','workspaces','users','memberships','entities',
          'accounts','transactions','entries','account_balances'
        )`,
    );
    for (const row of result.rows) {
      expect(row.relforcerowsecurity, `FORCE on ${row.relname}`).toBe(true);
    }
  });

  it('AUDITOR write-deny policies exist on entities/accounts/transactions/entries', async () => {
    const result = await tdb.pg.query<{ tablename: string; policyname: string }>(
      `SELECT tablename, policyname
         FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname LIKE 'auditor_no_%'`,
    );
    const policies = result.rows.map((r) => `${r.tablename}:${r.policyname}`);
    expect(policies).toContain('entities:auditor_no_write_entities');
    expect(policies).toContain('entities:auditor_no_update_entities');
    expect(policies).toContain('entities:auditor_no_delete_entities');
    expect(policies).toContain('accounts:auditor_no_write_accounts');
    expect(policies).toContain('transactions:auditor_no_write_transactions');
    expect(policies).toContain('entries:auditor_no_write_entries');
  });
});

describe('auth helper functions', () => {
  it('auth_clerk_user_id returns the current JWT subject', async () => {
    await tdb.setClerkUser('clerk_abc');
    const r = await tdb.pg.query<{ uid: string }>('SELECT auth_clerk_user_id() AS uid');
    expect(r.rows[0]?.uid).toBe('clerk_abc');
  });

  it('auth_user_org_id returns NULL when no membership exists', async () => {
    await tdb.setClerkUser('nobody');
    const r = await tdb.pg.query<{ org_id: string | null }>('SELECT auth_user_org_id() AS org_id');
    expect(r.rows[0]?.org_id).toBeNull();
  });

  it('auth_user_org_id resolves the org for an active membership', async () => {
    // Seed minimal: one org, one user, one membership.
    await tdb.pg.exec(`
      INSERT INTO organizations (id, clerk_org_id, name, slug)
        VALUES ('00000000-0000-0000-0000-000000000aaa', 'org_aaa', 'AAA', 'aaa');
      INSERT INTO users (id, clerk_user_id, email)
        VALUES ('00000000-0000-0000-0000-000000000bbb', 'user_aaa', 'a@x');
      INSERT INTO memberships (organization_id, user_id, role)
        VALUES (
          '00000000-0000-0000-0000-000000000aaa',
          '00000000-0000-0000-0000-000000000bbb',
          'OWNER'
        );
    `);
    await tdb.setClerkUser('user_aaa');
    const r = await tdb.pg.query<{ org_id: string; role: string }>(
      'SELECT auth_user_org_id() AS org_id, auth_user_role() AS role',
    );
    expect(r.rows[0]?.org_id).toBe('00000000-0000-0000-0000-000000000aaa');
    expect(r.rows[0]?.role).toBe('OWNER');

    // Cleanup so the next test starts clean.
    await tdb.pg.exec(`
      TRUNCATE TABLE memberships, users, organizations CASCADE;
    `);
  });
});
