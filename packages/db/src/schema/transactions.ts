import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { users } from './users.js';
import { workspaces } from './workspaces.js';

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    externalRef: varchar('external_ref', { length: 255 }),
    createdBy: uuid('created_by').references(() => users.id),
    reversesTransactionId: uuid('reverses_transaction_id').references(
      (): AnyPgColumn => transactions.id,
      { onDelete: 'restrict' },
    ),
    metadata: jsonb('metadata')
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index('idx_transactions_workspace').on(t.workspaceId),
    orgIdx: index('idx_transactions_org').on(t.organizationId),
    occurredIdx: index('idx_transactions_occurred').on(t.workspaceId, t.occurredAt),
  }),
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
