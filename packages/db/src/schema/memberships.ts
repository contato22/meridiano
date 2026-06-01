import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { users } from './users.js';

export const MEMBERSHIP_ROLES = [
  'OWNER',
  'FAMILY_PRINCIPAL',
  'OPERATOR',
  'ACCOUNTANT',
  'ADVISOR',
  'AUDITOR',
  'SYSTEM',
] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const MEMBERSHIP_STATUSES = ['ACTIVE', 'SUSPENDED', 'PENDING'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 30 }).$type<MembershipRole>().notNull(),
    workspaceAccess: jsonb('workspace_access')
      .notNull()
      .default(sql`'"*"'::jsonb`),
    status: varchar('status', { length: 20 }).$type<MembershipStatus>().notNull().default('ACTIVE'),
    invitedBy: uuid('invited_by').references(() => users.id),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('idx_memberships_org').on(t.organizationId),
    userIdx: index('idx_memberships_user').on(t.userId),
    roleIdx: index('idx_memberships_role').on(t.role),
    orgUserUnique: unique('memberships_organization_id_user_id_key').on(t.organizationId, t.userId),
  }),
);

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
