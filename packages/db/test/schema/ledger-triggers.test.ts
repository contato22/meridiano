import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../../src/testing/index.js';

/**
 * Ledger trigger behaviour is validated at the SQL level: we verify the
 * trigger functions and trigger bindings are installed correctly.
 *
 * End-to-end behaviour testing (committing balanced/unbalanced transactions,
 * verifying immutability rejections, observing account_balances updates) is
 * deferred to PR-F where we'll point the suite at a real PostgreSQL service
 * container or Supabase staging branch. PGlite's WASM build deadlocks
 * Vitest's worker threads when the trigger fires during a BEGIN/COMMIT cycle,
 * so the live-fire tests aren't usable inside this harness.
 *
 * A smoke probe that exercises the triggers end-to-end runs outside Vitest;
 * see scripts/probe-triggers.ts.
 */

let tdb: TestDatabase;

beforeAll(async () => {
  tdb = await createTestDatabase();
});

afterAll(async () => {
  await tdb.close();
});

async function functionExists(name: string): Promise<boolean> {
  const r = await tdb.pg.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = $1) AS exists`,
    [name],
  );
  return r.rows[0]?.exists ?? false;
}

async function triggerExists(name: string, table: string): Promise<boolean> {
  const r = await tdb.pg.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_trigger t
       JOIN pg_class c ON t.tgrelid = c.oid
       WHERE t.tgname = $1 AND c.relname = $2
     ) AS exists`,
    [name, table],
  );
  return r.rows[0]?.exists ?? false;
}

describe('ledger triggers — installation', () => {
  it('installs the entry currency-mismatch enforcement function', async () => {
    expect(await functionExists('enforce_entry_account_currency')).toBe(true);
    expect(await triggerExists('entries_currency_check', 'entries')).toBe(true);
  });

  it('installs the double-entry balance constraint trigger', async () => {
    expect(await functionExists('enforce_double_entry_balance')).toBe(true);
    expect(await triggerExists('entries_double_entry_balance', 'entries')).toBe(true);
  });

  it('installs the ledger immutability triggers', async () => {
    expect(await functionExists('enforce_ledger_immutability_transactions')).toBe(true);
    expect(await functionExists('enforce_ledger_immutability_entries')).toBe(true);
    expect(await triggerExists('transactions_immutability', 'transactions')).toBe(true);
    expect(await triggerExists('entries_immutability', 'entries')).toBe(true);
  });

  it('installs the balance-maintenance trigger', async () => {
    expect(await functionExists('apply_entry_to_balance')).toBe(true);
    expect(await triggerExists('entries_apply_to_balance', 'entries')).toBe(true);
  });

  it('installs the updated_at shared trigger function', async () => {
    expect(await functionExists('update_updated_at_column')).toBe(true);
  });
});

describe('ledger constraints', () => {
  it('amount_minor has a positive CHECK', async () => {
    const r = await tdb.pg.query<{ pg_get_constraintdef: string }>(
      `SELECT pg_get_constraintdef(c.oid)
         FROM pg_constraint c
         JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'entries' AND c.contype = 'c'`,
    );
    const checks = r.rows.map((row) => row.pg_get_constraintdef);
    expect(checks.some((c) => c.includes('amount_minor > 0'))).toBe(true);
  });

  it('entry side is constrained to debit | credit', async () => {
    const r = await tdb.pg.query<{ pg_get_constraintdef: string }>(
      `SELECT pg_get_constraintdef(c.oid)
         FROM pg_constraint c
         JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'entries' AND c.contype = 'c'`,
    );
    const checks = r.rows.map((row) => row.pg_get_constraintdef);
    expect(checks.some((c) => c.includes("'debit'") && c.includes("'credit'"))).toBe(true);
  });

  it('account type is constrained to known values', async () => {
    const r = await tdb.pg.query<{ pg_get_constraintdef: string }>(
      `SELECT pg_get_constraintdef(c.oid)
         FROM pg_constraint c
         JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'accounts' AND c.contype = 'c'`,
    );
    const checks = r.rows.map((row) => row.pg_get_constraintdef);
    expect(checks.some((c) => c.includes("'asset'"))).toBe(true);
  });

  it('entity requires at least one identifier', async () => {
    const r = await tdb.pg.query<{ pg_get_constraintdef: string }>(
      `SELECT pg_get_constraintdef(c.oid)
         FROM pg_constraint c
         JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'entities' AND c.conname = 'entity_has_identifier'`,
    );
    expect(r.rows).toHaveLength(1);
  });
});
