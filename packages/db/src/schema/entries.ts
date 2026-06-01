import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { transactions } from './transactions.js';

export const ENTRY_SIDES = ['debit', 'credit'] as const;
export type EntrySide = (typeof ENTRY_SIDES)[number];

export const entries = pgTable(
  'entries',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'restrict' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    side: varchar('side', { length: 6 }).$type<EntrySide>().notNull(),
    // bigint over `number` to preserve precision when totals exceed Number.MAX_SAFE_INTEGER.
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    memo: text('memo'),
    ordinal: integer('ordinal').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    transactionIdx: index('idx_entries_transaction').on(t.transactionId),
    accountIdx: index('idx_entries_account').on(t.accountId),
    accountCreatedIdx: index('idx_entries_account_created').on(t.accountId, t.createdAt),
    transactionOrdinalUnique: unique('entries_transaction_id_ordinal_key').on(
      t.transactionId,
      t.ordinal,
    ),
  }),
);

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
