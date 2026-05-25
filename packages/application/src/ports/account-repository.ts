import type { CurrencyCode, Result } from '@meridiano/domain';

export interface Account {
  readonly id: string;
  readonly workspaceId: string;
  readonly code: string;
  readonly name: string;
  readonly currency: CurrencyCode;
  readonly type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  readonly archivedAt: Date | null;
}

export class AccountNotFoundError extends Error {
  constructor(public readonly accountId: string) {
    super(`Account not found: ${accountId}`);
    this.name = 'AccountNotFoundError';
  }
}

export interface AccountRepository {
  findById(id: string): Promise<Result<Account, AccountNotFoundError>>;
  findManyByIds(ids: readonly string[]): Promise<readonly Account[]>;
  listByWorkspace(workspaceId: string): Promise<readonly Account[]>;
}
