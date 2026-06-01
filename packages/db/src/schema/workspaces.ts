import { sql } from 'drizzle-orm';
import { char, index, jsonb, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';

export const WORKSPACE_TYPES = ['PF', 'HOLDING', 'PORTFOLIO', 'REAL_ESTATE', 'CUSTOM'] as const;
export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    type: varchar('type', { length: 50 }).$type<WorkspaceType>().notNull(),
    baseCurrency: char('base_currency', { length: 3 }).notNull().default('BRL'),
    metadata: jsonb('metadata')
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('idx_workspaces_org').on(t.organizationId),
    orgSlugUnique: unique('workspaces_organization_id_slug_key').on(t.organizationId, t.slug),
  }),
);

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
