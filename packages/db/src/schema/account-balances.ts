import { bigint, char, integer, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';

export const accountBalances = pgTable(
  'account_balances',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    currency: char('currency', { length: 3 }).notNull(),
    balanceMinor: bigint('balance_minor', { mode: 'bigint' }).notNull().default(0n),
    lastEntryAt: timestamp('last_entry_at', { withTimezone: true }),
    entryCount: integer('entry_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.accountId, t.currency] }),
  }),
);

export type AccountBalance = typeof accountBalances.$inferSelect;
