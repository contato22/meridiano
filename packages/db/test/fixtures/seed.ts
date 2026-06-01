import { eq } from 'drizzle-orm';
import { accounts, memberships, organizations, users, workspaces } from '../../src/schema/index.js';
import type { TestDatabase } from '../../src/testing/index.js';

export interface TwoOrgFixture {
  orgA: { id: string; clerkOrgId: string };
  orgB: { id: string; clerkOrgId: string };
  userA: { id: string; clerkUserId: string };
  userB: { id: string; clerkUserId: string };
  workspaceA: { id: string };
  workspaceB: { id: string };
  accountA: { id: string };
  accountB: { id: string };
}

/**
 * Seeds two orgs, two users (one per org) with OWNER memberships, one
 * workspace per org, and one BRL Caixa account per workspace. Used to
 * exercise cross-tenant isolation. Bypasses RLS by clearing the JWT claim
 * before the inserts — RLS only filters reads when a claim is set.
 */
export async function seedTwoOrgs(tdb: TestDatabase): Promise<TwoOrgFixture> {
  await tdb.setClerkUser(null);

  return tdb.db.transaction(async (tx) => {
    const [orgA] = await tx
      .insert(organizations)
      .values({ clerkOrgId: 'org_a', name: 'Org A', slug: 'org-a' })
      .returning({ id: organizations.id, clerkOrgId: organizations.clerkOrgId });
    const [orgB] = await tx
      .insert(organizations)
      .values({ clerkOrgId: 'org_b', name: 'Org B', slug: 'org-b' })
      .returning({ id: organizations.id, clerkOrgId: organizations.clerkOrgId });

    const [userA] = await tx
      .insert(users)
      .values({ clerkUserId: 'user_a', email: 'a@example.test', name: 'User A' })
      .returning({ id: users.id, clerkUserId: users.clerkUserId });
    const [userB] = await tx
      .insert(users)
      .values({ clerkUserId: 'user_b', email: 'b@example.test', name: 'User B' })
      .returning({ id: users.id, clerkUserId: users.clerkUserId });

    if (!orgA || !orgB || !userA || !userB) throw new Error('seed: insert returned no row');

    await tx.insert(memberships).values([
      { organizationId: orgA.id, userId: userA.id, role: 'OWNER' },
      { organizationId: orgB.id, userId: userB.id, role: 'OWNER' },
    ]);

    const [wsA] = await tx
      .insert(workspaces)
      .values({ organizationId: orgA.id, name: 'WS A', slug: 'ws-a', type: 'HOLDING' })
      .returning({ id: workspaces.id });
    const [wsB] = await tx
      .insert(workspaces)
      .values({ organizationId: orgB.id, name: 'WS B', slug: 'ws-b', type: 'HOLDING' })
      .returning({ id: workspaces.id });
    if (!wsA || !wsB) throw new Error('seed: workspace insert');

    const [accA] = await tx
      .insert(accounts)
      .values({
        organizationId: orgA.id,
        workspaceId: wsA.id,
        code: '1.1.01',
        name: 'Caixa A',
        type: 'asset',
        currency: 'BRL',
      })
      .returning({ id: accounts.id });
    const [accB] = await tx
      .insert(accounts)
      .values({
        organizationId: orgB.id,
        workspaceId: wsB.id,
        code: '1.1.01',
        name: 'Caixa B',
        type: 'asset',
        currency: 'BRL',
      })
      .returning({ id: accounts.id });
    if (!accA || !accB) throw new Error('seed: account insert');

    return {
      orgA: { id: orgA.id, clerkOrgId: orgA.clerkOrgId },
      orgB: { id: orgB.id, clerkOrgId: orgB.clerkOrgId },
      userA: { id: userA.id, clerkUserId: userA.clerkUserId },
      userB: { id: userB.id, clerkUserId: userB.clerkUserId },
      workspaceA: { id: wsA.id },
      workspaceB: { id: wsB.id },
      accountA: { id: accA.id },
      accountB: { id: accB.id },
    };
  });
}

export const TRUNCATE_ALL_SQL = `
TRUNCATE TABLE
  organizations, workspaces, users, memberships, entities,
  accounts, transactions, entries, account_balances
CASCADE;
`;

export async function workspaceIdForAccount(tdb: TestDatabase, accountId: string): Promise<string> {
  const row = await tdb.db
    .select({ workspaceId: accounts.workspaceId })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  if (!row[0]) throw new Error(`no account ${accountId}`);
  return row[0].workspaceId;
}
