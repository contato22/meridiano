import type {
  Account,
  AccountRepository,
  Clock,
  IdGenerator,
  LedgerRepository,
  ListTransactionsFilter,
  ListTransactionsPage,
} from '../src/ports/index.js';
import { AccountNotFoundError } from '../src/ports/index.js';
import { err, ok, type Result, type Transaction } from '@meridiano/domain';

export class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly seed: readonly Account[] = []) {}

  findById(id: string): Promise<Result<Account, AccountNotFoundError>> {
    const account = this.seed.find((a) => a.id === id);
    return Promise.resolve(account ? ok(account) : err(new AccountNotFoundError(id)));
  }

  findManyByIds(ids: readonly string[]): Promise<readonly Account[]> {
    const found = ids
      .map((id) => this.seed.find((a) => a.id === id))
      .filter((a): a is Account => a !== undefined);
    return Promise.resolve(found);
  }

  listByWorkspace(workspaceId: string): Promise<readonly Account[]> {
    return Promise.resolve(this.seed.filter((a) => a.workspaceId === workspaceId));
  }
}

export class InMemoryLedgerRepository implements LedgerRepository {
  readonly saved: Transaction[] = [];

  save(transaction: Transaction): Promise<void> {
    this.saved.push(transaction);
    return Promise.resolve();
  }

  findById(id: string): Promise<Transaction | null> {
    return Promise.resolve(this.saved.find((t) => t.id === id) ?? null);
  }

  list(filter: ListTransactionsFilter): Promise<ListTransactionsPage> {
    const items = this.saved.filter((t) => {
      if (t.workspaceId !== filter.workspaceId) return false;
      if (filter.from && t.occurredAt < filter.from) return false;
      if (filter.to && t.occurredAt > filter.to) return false;
      return true;
    });
    return Promise.resolve({ items, nextCursor: null });
  }
}

export class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}
  now(): Date {
    return this.fixed;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  constructor(private readonly prefix = 'tx-') {}
  next(): string {
    this.counter += 1;
    return `${this.prefix}${String(this.counter).padStart(4, '0')}`;
  }
}
