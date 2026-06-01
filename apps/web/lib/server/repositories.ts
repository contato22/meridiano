/**
 * Dev-mode persistence. Until PR-B finishes wiring Clerk + Supabase, the app
 * runs against in-memory repositories pre-seeded with the AWQ Group fixture.
 *
 * The shape of the data here mirrors what migration 0007_seed.sql would
 * insert in dev/staging. Swapping to Drizzle adapters is a one-line change
 * (replace the constructor calls below) — the rest of the app talks only to
 * the application-layer ports.
 *
 * Server-only; never bundled into client code.
 */
import 'server-only';
import {
  AccountNotFoundError,
  systemClock,
  type Account,
  type AccountRepository,
  type Clock,
  type IdGenerator,
  type LedgerRepository,
  type ListTransactionsFilter,
  type ListTransactionsPage,
} from '@meridiano/application';
import { err, ok, type Result, type Transaction } from '@meridiano/domain';

class MemoryAccountRepository implements AccountRepository {
  constructor(private readonly accounts: Account[]) {}
  findById(id: string): Promise<Result<Account, AccountNotFoundError>> {
    const a = this.accounts.find((x) => x.id === id);
    return Promise.resolve(a ? ok(a) : err(new AccountNotFoundError(id)));
  }
  findManyByIds(ids: readonly string[]): Promise<readonly Account[]> {
    return Promise.resolve(this.accounts.filter((a) => ids.includes(a.id)));
  }
  listByWorkspace(workspaceId: string): Promise<readonly Account[]> {
    return Promise.resolve(
      this.accounts
        .filter((a) => a.workspaceId === workspaceId && a.archivedAt === null)
        .sort((a, b) => a.code.localeCompare(b.code)),
    );
  }
  add(account: Account): void {
    this.accounts.push(account);
  }
  all(): readonly Account[] {
    return [...this.accounts];
  }
}

class MemoryLedgerRepository implements LedgerRepository {
  readonly saved: Transaction[] = [];
  save(transaction: Transaction): Promise<void> {
    this.saved.push(transaction);
    return Promise.resolve();
  }
  findById(id: string): Promise<Transaction | null> {
    return Promise.resolve(this.saved.find((t) => t.id === id) ?? null);
  }
  list(filter: ListTransactionsFilter): Promise<ListTransactionsPage> {
    const items = this.saved
      .filter((t) => {
        if (t.workspaceId !== filter.workspaceId) return false;
        if (filter.from && t.occurredAt < filter.from) return false;
        if (filter.to && t.occurredAt > filter.to) return false;
        return true;
      })
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    return Promise.resolve({ items, nextCursor: null });
  }
}

class CryptoIds implements IdGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}

// Stable IDs that match the seed in packages/db/src/seed/awq.ts so the dev
// experience matches what a real migration would produce.
export const AWQ = {
  orgId: '00000000-0000-0000-0000-000000000001',
  orgName: 'AWQ Group',
  workspaces: {
    pf: { id: '10000000-0000-0000-0000-000000000001', name: 'PF Miguel', slug: 'pf-miguel' },
    holding: {
      id: '10000000-0000-0000-0000-000000000002',
      name: 'AWQ Holding',
      slug: 'awq-holding',
    },
    portfolio: {
      id: '10000000-0000-0000-0000-000000000003',
      name: 'M4E Portfolio',
      slug: 'm4e-portfolio',
    },
    realEstate: {
      id: '10000000-0000-0000-0000-000000000004',
      name: 'Imóveis & Bens',
      slug: 'imoveis-bens',
    },
  },
} as const;

const seedAccounts: Account[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    workspaceId: AWQ.workspaces.holding.id,
    code: '1.1.01',
    name: 'Caixa',
    currency: 'BRL',
    type: 'asset',
    archivedAt: null,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    workspaceId: AWQ.workspaces.holding.id,
    code: '1.1.02',
    name: 'Banco — Conta Corrente',
    currency: 'BRL',
    type: 'asset',
    archivedAt: null,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    workspaceId: AWQ.workspaces.holding.id,
    code: '3.1.01',
    name: 'Receitas Operacionais',
    currency: 'BRL',
    type: 'revenue',
    archivedAt: null,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    workspaceId: AWQ.workspaces.holding.id,
    code: '4.1.01',
    name: 'Despesas de Aluguel',
    currency: 'BRL',
    type: 'expense',
    archivedAt: null,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    workspaceId: AWQ.workspaces.holding.id,
    code: '4.1.02',
    name: 'Despesas Operacionais',
    currency: 'BRL',
    type: 'expense',
    archivedAt: null,
  },
];

// Node will re-import this module across multiple compilation units in dev
// mode (HMR), so we stash the singleton on globalThis. In production builds
// this still works since the module loader caches.
declare global {
  // eslint-disable-next-line no-var
  var __meridiano_repos__:
    | undefined
    | {
        accounts: MemoryAccountRepository;
        ledger: MemoryLedgerRepository;
        clock: Clock;
        idGenerator: IdGenerator;
      };
}

function ensureRepos() {
  if (!globalThis.__meridiano_repos__) {
    globalThis.__meridiano_repos__ = {
      accounts: new MemoryAccountRepository([...seedAccounts]),
      ledger: new MemoryLedgerRepository(),
      clock: systemClock,
      idGenerator: new CryptoIds(),
    };
  }
  return globalThis.__meridiano_repos__;
}

export function getRepositories() {
  return ensureRepos();
}

export function getAccounts(): MemoryAccountRepository {
  return ensureRepos().accounts;
}

export function getLedger(): MemoryLedgerRepository {
  return ensureRepos().ledger;
}

// Holding first so its (seeded) chart of accounts shows up by default in the
// transaction form. PR-F will replace this with the real workspace listing
// scoped to the caller's org.
export const WORKSPACES = [
  AWQ.workspaces.holding,
  AWQ.workspaces.pf,
  AWQ.workspaces.portfolio,
  AWQ.workspaces.realEstate,
];
