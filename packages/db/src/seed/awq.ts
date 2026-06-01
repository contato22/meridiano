/**
 * Seed data for the AWQ Group demo environment.
 *
 * Real production org records are created via the Clerk webhook on user
 * signup — this file is for `pnpm db:seed` against a local/staging DB only.
 *
 * The CNPJ of `AWQ Produções Ltda` is a placeholder until you provide the
 * real one; the value below is a syntactically valid CNPJ used purely so
 * the migration check constraints don't fail in dev. **Replace before any
 * fiscal use.**
 */
import type { Database } from '../client/index.js';
import { accounts, entities, organizations, workspaces } from '../schema/index.js';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const PF_WS = '10000000-0000-0000-0000-000000000001';
const HOLDING_WS = '10000000-0000-0000-0000-000000000002';
const PORTFOLIO_WS = '10000000-0000-0000-0000-000000000003';
const REAL_ESTATE_WS = '10000000-0000-0000-0000-000000000004';

// Placeholder CNPJ — replace with the real AWQ Produções Ltda CNPJ before
// the seed is used in any fiscal/regulatory context.
const PLACEHOLDER_AWQ_CNPJ = '11222333000181';

export async function seedAwqGroup(db: Database): Promise<void> {
  await db
    .insert(organizations)
    .values({
      id: ORG_ID,
      clerkOrgId: 'org_placeholder_awq',
      name: 'AWQ Group',
      slug: 'awq-group',
      settings: {
        timezone: 'America/Sao_Paulo',
        base_currency: 'BRL',
        fiscal_year_start: '01-01',
      },
    })
    .onConflictDoNothing();

  await db
    .insert(workspaces)
    .values([
      { id: PF_WS, organizationId: ORG_ID, name: 'PF Miguel', slug: 'pf-miguel', type: 'PF' },
      {
        id: HOLDING_WS,
        organizationId: ORG_ID,
        name: 'AWQ Holding',
        slug: 'awq-holding',
        type: 'HOLDING',
      },
      {
        id: PORTFOLIO_WS,
        organizationId: ORG_ID,
        name: 'M4E Portfolio',
        slug: 'm4e-portfolio',
        type: 'PORTFOLIO',
      },
      {
        id: REAL_ESTATE_WS,
        organizationId: ORG_ID,
        name: 'Imóveis & Bens',
        slug: 'imoveis-bens',
        type: 'REAL_ESTATE',
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(entities)
    .values({
      organizationId: ORG_ID,
      workspaceId: HOLDING_WS,
      type: 'LLC',
      name: 'AWQ Produções',
      legalName: 'AWQ Produções Ltda',
      cnpj: PLACEHOLDER_AWQ_CNPJ,
      jurisdiction: 'BR',
    })
    .onConflictDoNothing();

  // Minimal chart of accounts so the demo workspace can record a transaction.
  await db
    .insert(accounts)
    .values([
      {
        organizationId: ORG_ID,
        workspaceId: HOLDING_WS,
        code: '1.1.01',
        name: 'Caixa',
        type: 'asset',
        currency: 'BRL',
      },
      {
        organizationId: ORG_ID,
        workspaceId: HOLDING_WS,
        code: '4.1.01',
        name: 'Despesas de Aluguel',
        type: 'expense',
        currency: 'BRL',
      },
      {
        organizationId: ORG_ID,
        workspaceId: HOLDING_WS,
        code: '3.1.01',
        name: 'Receitas Operacionais',
        type: 'revenue',
        currency: 'BRL',
      },
    ])
    .onConflictDoNothing();
}
