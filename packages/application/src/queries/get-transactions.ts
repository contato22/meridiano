import type {
  LedgerRepository,
  ListTransactionsFilter,
  ListTransactionsPage,
} from '../ports/index.js';

export type GetTransactionsByWorkspaceInput = ListTransactionsFilter;

export interface GetTransactionsDeps {
  readonly ledger: LedgerRepository;
}

export function getTransactionsByWorkspace(
  input: GetTransactionsByWorkspaceInput,
  deps: GetTransactionsDeps,
): Promise<ListTransactionsPage> {
  return deps.ledger.list(input);
}
