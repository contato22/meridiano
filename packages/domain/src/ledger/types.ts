import type { CurrencyCode } from '../money/currency.js';
import type { Money } from '../money/money.js';

export type EntrySide = 'debit' | 'credit';

export interface AccountRef {
  readonly id: string;
  readonly currency: CurrencyCode;
}

export interface EntryInput {
  readonly account: AccountRef;
  readonly side: EntrySide;
  readonly amount: Money;
  readonly memo?: string | undefined;
}

export interface TransactionInput {
  readonly workspaceId: string;
  readonly occurredAt: Date;
  readonly description: string;
  readonly entries: readonly EntryInput[];
  readonly externalRef?: string | undefined;
}
