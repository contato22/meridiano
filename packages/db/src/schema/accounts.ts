import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  char,
  index,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { workspaces } from './workspaces.js';

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const accounts = pgTable(
  'accounts',
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
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 20 }).$type<AccountType>().notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => accounts.id, {
      onDelete: 'restrict',
    }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    metadata: jsonb('metadata')
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index('idx_accounts_workspace').on(t.workspaceId),
    orgIdx: index('idx_accounts_org').on(t.organizationId),
    workspaceCodeUnique: unique('accounts_workspace_id_code_key').on(t.workspaceId, t.code),
  }),
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
