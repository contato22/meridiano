import {
  AccountNotFoundError,
  type AccountRepository,
  type Clock,
  type IdGenerator,
  type LedgerRepository,
} from '../ports/index.js';
import {
  InvalidEntryError,
  Money,
  Transaction,
  err,
  ok,
  type CurrencyCode,
  type EntryInput,
  type EntrySide,
  type LedgerError,
  type Result,
  type TransactionInput,
} from '@meridiano/domain';

export interface RecordTransactionInput {
  readonly workspaceId: string;
  readonly occurredAt?: Date;
  readonly description: string;
  readonly externalRef?: string;
  readonly entries: readonly {
    readonly accountId: string;
    readonly side: EntrySide;
    /** Decimal string ("100.00") or { minor, currency }. */
    readonly amount: { minor: string; currency: CurrencyCode } | { decimal: string };
    readonly memo?: string;
  }[];
}

export type RecordTransactionError = LedgerError | AccountNotFoundError;

export interface RecordTransactionDeps {
  readonly accounts: AccountRepository;
  readonly ledger: LedgerRepository;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

/**
 * Records a double-entry transaction.
 *
 * Flow:
 *   1. Resolve every referenced account from the repository — fail fast if any
 *      is missing.
 *   2. Use each account's currency to construct Money for the entry. We never
 *      trust caller-supplied currency for the account; the source of truth is
 *      the account record.
 *   3. Delegate validation to `Transaction.create` (per-currency balance, etc.).
 *   4. Persist via the ledger repository.
 *
 * Returns the saved Transaction or a domain/infrastructure error.
 */
export async function recordTransaction(
  input: RecordTransactionInput,
  deps: RecordTransactionDeps,
): Promise<Result<Transaction, RecordTransactionError>> {
  const uniqueAccountIds = Array.from(new Set(input.entries.map((e) => e.accountId)));
  const accounts = await deps.accounts.findManyByIds(uniqueAccountIds);
  const accountsById = new Map(accounts.map((a) => [a.id, a]));

  for (const id of uniqueAccountIds) {
    if (!accountsById.has(id)) {
      return err(new AccountNotFoundError(id));
    }
  }

  const domainEntries: EntryInput[] = [];
  for (const entry of input.entries) {
    const account = accountsById.get(entry.accountId);
    if (!account) {
      return err(new AccountNotFoundError(entry.accountId));
    }
    if (account.archivedAt !== null) {
      return err(new InvalidEntryError(`Account ${account.id} is archived`));
    }

    const amountResult = buildAmount(entry.amount, account.currency);
    if (!amountResult.ok) return amountResult;

    domainEntries.push({
      account: { id: account.id, currency: account.currency },
      side: entry.side,
      amount: amountResult.value,
      memo: entry.memo,
    });
  }

  const txInput: TransactionInput = {
    workspaceId: input.workspaceId,
    occurredAt: input.occurredAt ?? deps.clock.now(),
    description: input.description,
    entries: domainEntries,
    externalRef: input.externalRef,
  };
  const txResult = Transaction.create(txInput, () => deps.idGenerator.next());
  if (!txResult.ok) return txResult;

  await deps.ledger.save(txResult.value);
  return ok(txResult.value);
}

function buildAmount(
  amount: RecordTransactionInput['entries'][number]['amount'],
  accountCurrency: CurrencyCode,
): Result<Money, LedgerError> {
  if ('decimal' in amount) {
    const parsed = Money.parse(amount.decimal, accountCurrency);
    if (!parsed.ok) {
      return err(new InvalidEntryError(`Invalid decimal amount: ${parsed.error.message}`));
    }
    return ok(parsed.value);
  }
  if (amount.currency !== accountCurrency) {
    return err(
      new InvalidEntryError(
        `Entry currency ${amount.currency} does not match account currency ${accountCurrency}`,
      ),
    );
  }
  if (!/^-?\d+$/.test(amount.minor)) {
    return err(new InvalidEntryError(`Invalid minor amount: "${amount.minor}"`));
  }
  return ok(Money.fromMinor(BigInt(amount.minor), accountCurrency));
}
