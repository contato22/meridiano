import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { schema, applyMigrations, defaultMigrationsDir } from '@meridiano/db';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { Money, Transaction } from '@meridiano/domain';
import { DrizzleAccountRepository, DrizzleLedgerRepository } from '../src/persistence/index.js';

let pg: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;
let accountRepo: DrizzleAccountRepository;
let ledgerRepo: DrizzleLedgerRepository;
let workspaceId: string;
let caixaId: string;
let despesasId: string;

beforeAll(async () => {
  pg = new PGlite();
  await pg.waitReady;
  await applyMigrations(defaultMigrationsDir(import.meta), {
    exec: async (s) => {
      await pg.exec(s);
    },
  });
  db = drizzle(pg, { schema });
  accountRepo = new DrizzleAccountRepository(db);
  ledgerRepo = new DrizzleLedgerRepository(db);
});

afterAll(async () => {
  await pg.close();
});

beforeEach(async () => {
  await pg.exec(`
    TRUNCATE TABLE
      organizations, workspaces, users, memberships, entities,
      accounts, transactions, entries, account_balances
    CASCADE;
  `);

  const [org] = await db
    .insert(schema.organizations)
    .values({ clerkOrgId: 'org_x', name: 'Org X', slug: 'org-x' })
    .returning({ id: schema.organizations.id });
  if (!org) throw new Error();

  const [ws] = await db
    .insert(schema.workspaces)
    .values({ organizationId: org.id, name: 'WS', slug: 'ws', type: 'HOLDING' })
    .returning({ id: schema.workspaces.id });
  if (!ws) throw new Error();
  workspaceId = ws.id;

  const [caixa] = await db
    .insert(schema.accounts)
    .values({
      organizationId: org.id,
      workspaceId: ws.id,
      code: '1.1.01',
      name: 'Caixa',
      type: 'asset',
      currency: 'BRL',
    })
    .returning({ id: schema.accounts.id });
  const [despesas] = await db
    .insert(schema.accounts)
    .values({
      organizationId: org.id,
      workspaceId: ws.id,
      code: '4.1.01',
      name: 'Despesas',
      type: 'expense',
      currency: 'BRL',
    })
    .returning({ id: schema.accounts.id });
  if (!caixa || !despesas) throw new Error();
  caixaId = caixa.id;
  despesasId = despesas.id;
});

describe('DrizzleAccountRepository', () => {
  it('findById returns ok with the account', async () => {
    const r = await accountRepo.findById(caixaId);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.code).toBe('1.1.01');
      expect(r.value.currency).toBe('BRL');
      expect(r.value.type).toBe('asset');
    }
  });

  it('findById returns err when the account does not exist', async () => {
    const r = await accountRepo.findById('00000000-0000-0000-0000-000000000000');
    expect(r.ok).toBe(false);
  });

  it('findManyByIds returns only the existing accounts', async () => {
    const r = await accountRepo.findManyByIds([
      caixaId,
      despesasId,
      '00000000-0000-0000-0000-000000000000',
    ]);
    expect(r).toHaveLength(2);
    expect(r.map((a) => a.id).sort()).toEqual([caixaId, despesasId].sort());
  });

  it('listByWorkspace returns accounts in the workspace', async () => {
    const r = await accountRepo.listByWorkspace(workspaceId);
    expect(r).toHaveLength(2);
  });

  it('findManyByIds handles empty input', async () => {
    const r = await accountRepo.findManyByIds([]);
    expect(r).toHaveLength(0);
  });
});

describe('DrizzleLedgerRepository', () => {
  function makeBalancedTx(id: string): Transaction {
    const r = Transaction.create(
      {
        workspaceId,
        occurredAt: new Date('2026-02-15T10:00:00Z'),
        description: 'Pagamento aluguel',
        entries: [
          {
            account: { id: despesasId, currency: 'BRL' },
            side: 'debit',
            amount: Money.parseUnsafe('5000.00', 'BRL'),
          },
          {
            account: { id: caixaId, currency: 'BRL' },
            side: 'credit',
            amount: Money.parseUnsafe('5000.00', 'BRL'),
          },
        ],
      },
      () => id,
    );
    if (!r.ok) throw r.error;
    return r.value;
  }

  it('save persists a transaction with all its entries', async () => {
    const tx = makeBalancedTx('11111111-1111-1111-1111-111111111111');
    await ledgerRepo.save(tx);

    const rows = await db.select().from(schema.transactions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(tx.id);

    const entries = await db.select().from(schema.entries);
    expect(entries).toHaveLength(2);
  });

  it('findById rehydrates a saved transaction', async () => {
    const tx = makeBalancedTx('22222222-2222-2222-2222-222222222222');
    await ledgerRepo.save(tx);

    const r = await ledgerRepo.findById(tx.id);
    expect(r).not.toBeNull();
    expect(r?.id).toBe(tx.id);
    expect(r?.entries).toHaveLength(2);
    expect(r?.debitTotal('BRL').toString()).toBe('5000.00');
    expect(r?.description).toBe('Pagamento aluguel');
  });

  it('findById returns null for an unknown id', async () => {
    const r = await ledgerRepo.findById('00000000-0000-0000-0000-000000000000');
    expect(r).toBeNull();
  });

  it('list filters by workspace and returns paginated results', async () => {
    await ledgerRepo.save(makeBalancedTx('33333333-3333-3333-3333-333333333333'));
    await ledgerRepo.save(makeBalancedTx('44444444-4444-4444-4444-444444444444'));

    const page = await ledgerRepo.list({ workspaceId });
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it('list filters by date range', async () => {
    const r1 = Transaction.create(
      {
        workspaceId,
        occurredAt: new Date('2026-01-01T00:00:00Z'),
        description: 'old',
        entries: [
          {
            account: { id: despesasId, currency: 'BRL' },
            side: 'debit',
            amount: Money.parseUnsafe('1.00', 'BRL'),
          },
          {
            account: { id: caixaId, currency: 'BRL' },
            side: 'credit',
            amount: Money.parseUnsafe('1.00', 'BRL'),
          },
        ],
      },
      () => '55555555-5555-5555-5555-555555555555',
    );
    const r2 = Transaction.create(
      {
        workspaceId,
        occurredAt: new Date('2026-03-01T00:00:00Z'),
        description: 'new',
        entries: [
          {
            account: { id: despesasId, currency: 'BRL' },
            side: 'debit',
            amount: Money.parseUnsafe('2.00', 'BRL'),
          },
          {
            account: { id: caixaId, currency: 'BRL' },
            side: 'credit',
            amount: Money.parseUnsafe('2.00', 'BRL'),
          },
        ],
      },
      () => '66666666-6666-6666-6666-666666666666',
    );
    if (!r1.ok || !r2.ok) throw new Error();
    await ledgerRepo.save(r1.value);
    await ledgerRepo.save(r2.value);

    const page = await ledgerRepo.list({
      workspaceId,
      from: new Date('2026-02-01T00:00:00Z'),
    });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.description).toBe('new');
  });
});
