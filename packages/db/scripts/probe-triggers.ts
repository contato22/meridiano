/**
 * Smoke probe for the ledger triggers. Runs outside Vitest because PGlite +
 * Vitest worker threads deadlock on BEGIN/COMMIT cycles that fire a
 * DEFERRABLE constraint trigger. Inside a plain Node process the same SQL
 * works correctly, so we exercise it here.
 *
 * Run with:  pnpm exec tsx scripts/probe-triggers.ts
 *
 * Exits with 0 on success, 1 on any unexpected behaviour. Used as a sanity
 * check during development; PR-F adds the real CI integration test against
 * Supabase or a Postgres service container.
 */
import { eq } from 'drizzle-orm';
import { accounts, accountBalances, entries, transactions } from '../src/schema/index.js';
import { createTestDatabase } from '../src/testing/index.js';
import { seedTwoOrgs } from '../test/fixtures/seed.js';

async function expectThrows<T>(label: string, p: Promise<T>, pattern: RegExp): Promise<void> {
  try {
    await p;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (pattern.test(msg)) {
      console.log(`  ✓ ${label}`);
      return;
    }
    throw new Error(`${label}: error did not match ${String(pattern)}: ${msg}`);
  }
  throw new Error(`${label}: expected error matching ${String(pattern)}, none thrown`);
}

const tdb = await createTestDatabase();
const fx = await seedTwoOrgs(tdb);

const [expense] = await tdb.db
  .insert(accounts)
  .values({
    organizationId: fx.orgA.id,
    workspaceId: fx.workspaceA.id,
    code: '4.1.01',
    name: 'Expense',
    type: 'expense',
    currency: 'BRL',
  })
  .returning({ id: accounts.id });
if (!expense) throw new Error('expense seed');

console.log('▸ balanced transaction commits');
await tdb.db.transaction(async (tx) => {
  const [t] = await tx
    .insert(transactions)
    .values({
      organizationId: fx.orgA.id,
      workspaceId: fx.workspaceA.id,
      description: 'pagamento aluguel',
      occurredAt: new Date(),
    })
    .returning({ id: transactions.id });
  if (!t) throw new Error('tx insert');
  await tx.insert(entries).values([
    {
      transactionId: t.id,
      accountId: expense.id,
      side: 'debit',
      amountMinor: 500000n,
      currency: 'BRL',
      ordinal: 0,
    },
    {
      transactionId: t.id,
      accountId: fx.accountA.id,
      side: 'credit',
      amountMinor: 500000n,
      currency: 'BRL',
      ordinal: 1,
    },
  ]);
});
console.log('  ✓ committed');

console.log('▸ account_balances has been updated by the trigger');
const balances = await tdb.db.select().from(accountBalances);
const caixa = balances.find((b) => b.accountId === fx.accountA.id);
const desp = balances.find((b) => b.accountId === expense.id);
if (caixa?.balanceMinor !== -500000n) {
  throw new Error(`Caixa expected -500000, got ${String(caixa?.balanceMinor)}`);
}
if (desp?.balanceMinor !== 500000n) {
  throw new Error(`Expense expected 500000, got ${String(desp?.balanceMinor)}`);
}
console.log('  ✓ Caixa = -500000, Expense = +500000 (asset on credit, expense on debit)');

console.log('▸ unbalanced transaction is rejected at commit');
await expectThrows(
  'unbalanced rejected',
  tdb.db.transaction(async (tx) => {
    const [t] = await tx
      .insert(transactions)
      .values({
        organizationId: fx.orgA.id,
        workspaceId: fx.workspaceA.id,
        description: 'unbalanced',
        occurredAt: new Date(),
      })
      .returning({ id: transactions.id });
    if (!t) throw new Error();
    await tx.insert(entries).values([
      {
        transactionId: t.id,
        accountId: expense.id,
        side: 'debit',
        amountMinor: 100n,
        currency: 'BRL',
        ordinal: 0,
      },
      {
        transactionId: t.id,
        accountId: fx.accountA.id,
        side: 'credit',
        amountMinor: 99n,
        currency: 'BRL',
        ordinal: 1,
      },
    ]);
  }),
  /unbalanced/,
);

console.log('▸ currency mismatch is rejected at insert');
const [tx2] = await tdb.db
  .insert(transactions)
  .values({
    organizationId: fx.orgA.id,
    workspaceId: fx.workspaceA.id,
    description: 'currency probe',
    occurredAt: new Date(),
  })
  .returning({ id: transactions.id });
if (!tx2) throw new Error();
await expectThrows(
  'currency mismatch',
  tdb.db.insert(entries).values({
    transactionId: tx2.id,
    accountId: fx.accountA.id, // BRL
    side: 'debit',
    amountMinor: 100n,
    currency: 'USD',
  }),
  /does not match account currency/,
);

console.log('▸ entries are immutable (UPDATE rejected)');
await expectThrows(
  'entry update rejected',
  tdb.db.update(entries).set({ memo: 'tampered' }),
  /append-only/,
);

console.log('▸ transactions are immutable (DELETE rejected)');
await expectThrows(
  'transaction delete rejected',
  tdb.db.delete(transactions).where(eq(transactions.id, tx2.id)),
  /append-only/,
);

await tdb.close();
console.log('\nAll trigger probes passed.');
