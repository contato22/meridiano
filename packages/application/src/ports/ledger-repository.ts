import type { Transaction } from '@meridiano/domain';

export interface ListTransactionsFilter {
  readonly workspaceId: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface ListTransactionsPage {
  readonly items: readonly Transaction[];
  readonly nextCursor: string | null;
}

export interface LedgerRepository {
  save(transaction: Transaction): Promise<void>;
  findById(id: string): Promise<Transaction | null>;
  list(filter: ListTransactionsFilter): Promise<ListTransactionsPage>;
}
