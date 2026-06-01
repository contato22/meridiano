import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { workspaces } from './workspaces.js';

export const ENTITY_TYPES = [
  'INDIVIDUAL',
  'LLC',
  'CORPORATION',
  'TRUST',
  'FOUNDATION',
  'PARTNERSHIP',
  'OFFSHORE',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const entities = pgTable(
  'entities',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    type: varchar('type', { length: 30 }).$type<EntityType>().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    legalName: varchar('legal_name', { length: 255 }),
    cpf: varchar('cpf', { length: 11 }),
    cnpj: varchar('cnpj', { length: 14 }),
    taxId: varchar('tax_id', { length: 50 }),
    jurisdiction: char('jurisdiction', { length: 2 }).notNull().default('BR'),
    address: jsonb('address'),
    isActive: boolean('is_active').notNull().default(true),
    metadata: jsonb('metadata')
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('idx_entities_org').on(t.organizationId),
    workspaceIdx: index('idx_entities_workspace').on(t.workspaceId),
    typeIdx: index('idx_entities_type').on(t.type),
  }),
);

export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
