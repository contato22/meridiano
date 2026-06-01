import { and, eq, gte, inArray, lte, type ExtractTablesWithRelations, type SQL } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type {
  LedgerRepository,
  ListTransactionsFilter,
  ListTransactionsPage,
} from '@meridiano/application';
import {
  InvalidEntryError,
  LedgerEntry,
  Money,
  Transaction,
  isCurrencyCode,
  type EntrySide,
} from '@meridiano/domain';
import { schema } from '@meridiano/db';

type AnyPgDatabase = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Drizzle-backed LedgerRepository. Implements the read/write contract that
 * `@meridiano/application` expects, mapping `Transaction` domain aggregates
 * to the (transactions, entries) tables.
 */
export class DrizzleLedgerRepository implements LedgerRepository {
  constructor(private readonly db: AnyPgDatabase) {}

  /**
   * Persists a `Transaction` aggregate atomically: header + every entry in a
   * single SQL transaction. The 0010 constraint trigger validates the
   * per-currency balance at commit time as a final defense.
   */
  async save(tx: Transaction): Promise<void> {
    await this.db.transaction(async (q) => {
      // We don't yet expose `organizationId` on the domain aggregate (it lives
      // implicitly via workspaceId → workspaces.organization_id). For the
      // persistence step we look it up explicitly so the row carries it.
      const ws = await q
        .select({ organizationId: schema.workspaces.organizationId })
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, tx.workspaceId))
        .limit(1);
      const orgId = ws[0]?.organizationId;
      if (!orgId) {
        throw new InvalidEntryError(
          `Cannot persist transaction: workspace ${tx.workspaceId} not found`,
        );
      }

      await q.insert(schema.transactions).values({
        id: tx.id,
        organizationId: orgId,
        workspaceId: tx.workspaceId,
        description: tx.description,
        occurredAt: tx.occurredAt,
        externalRef: tx.externalRef ?? null,
      });

      await q.insert(schema.entries).values(
        tx.entries.map((e, i) => ({
          transactionId: tx.id,
          accountId: e.account.id,
          side: e.side,
          amountMinor: e.amount.minor,
          currency: e.amount.currency,
          memo: e.memo ?? null,
          ordinal: i,
        })),
      );
    });
  }

  async findById(id: string): Promise<Transaction | null> {
    const txRows = await this.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .limit(1);
    const txRow = txRows[0];
    if (!txRow) return null;
    const entryRows = await this.db
      .select()
      .from(schema.entries)
      .where(eq(schema.entries.transactionId, id));
    return rehydrate(txRow, entryRows);
  }

  async list(filter: ListTransactionsFilter): Promise<ListTransactionsPage> {
    const conditions: SQL[] = [eq(schema.transactions.workspaceId, filter.workspaceId)];
    if (filter.from) conditions.push(gte(schema.transactions.occurredAt, filter.from));
    if (filter.to) conditions.push(lte(schema.transactions.occurredAt, filter.to));

    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
    const txRows = await this.db
      .select()
      .from(schema.transactions)
      .where(and(...conditions))
      .orderBy(schema.transactions.occurredAt)
      .limit(limit);

    if (txRows.length === 0) return { items: [], nextCursor: null };

    const ids = txRows.map((r) => r.id);
    const allEntries = await this.db
      .select()
      .from(schema.entries)
      .where(inArrayHelper(schema.entries.transactionId, ids));

    const entriesByTx = new Map<string, (typeof allEntries)[number][]>();
    for (const e of allEntries) {
      const arr = entriesByTx.get(e.transactionId) ?? [];
      arr.push(e);
      entriesByTx.set(e.transactionId, arr);
    }

    const items: Transaction[] = [];
    for (const txRow of txRows) {
      const t = rehydrate(txRow, entriesByTx.get(txRow.id) ?? []);
      if (t) items.push(t);
    }

    return { items, nextCursor: null };
  }
}

// inArray helper that handles the empty-array case (Drizzle emits invalid
// `WHERE column IN ()` SQL otherwise).
function inArrayHelper(column: typeof schema.entries.transactionId, ids: readonly string[]): SQL {
  if (ids.length === 0) return eq(column, '__no_match__');
  return inArray(column, [...ids]);
}

function rehydrate(
  txRow: typeof schema.transactions.$inferSelect,
  entryRows: readonly (typeof schema.entries.$inferSelect)[],
): Transaction | null {
  // Sort entries by ordinal so the rehydrated aggregate preserves the original
  // user-entered order.
  const sorted = [...entryRows].sort((a, b) => a.ordinal - b.ordinal);

  const domainEntries: LedgerEntry[] = [];
  for (const row of sorted) {
    if (!isCurrencyCode(row.currency)) return null;
    const side: EntrySide = row.side;
    domainEntries.push(
      new LedgerEntry(
        { id: row.accountId, currency: row.currency },
        side,
        Money.fromMinor(row.amountMinor, row.currency),
        row.memo ?? undefined,
      ),
    );
  }

  // Build a Transaction without re-running Transaction.create() (we'd lose
  // the persisted id and have to re-validate already-committed data). The
  // private constructor of Transaction is unavailable here, so we use an
  // unsafe rehydration helper that lives in the domain package.
  return Transaction.rehydrate({
    id: txRow.id,
    workspaceId: txRow.workspaceId,
    occurredAt: txRow.occurredAt,
    description: txRow.description,
    entries: domainEntries,
    externalRef: txRow.externalRef ?? undefined,
  });
}
