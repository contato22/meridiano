import type { Result } from '../result.js';
import { err, ok } from '../result.js';
import type { CurrencyCode } from '../money/currency.js';
import { Money } from '../money/money.js';
import { EmptyTransactionError, InvalidEntryError, UnbalancedTransactionError } from './errors.js';
import type { LedgerError } from './errors.js';
import type { AccountRef, EntryInput, EntrySide, TransactionInput } from './types.js';

/**
 * A double-entry transaction. Invariants enforced at construction:
 *   1. Non-empty (at least one debit and one credit).
 *   2. Per-currency balance: sum(debits) === sum(credits) for every currency
 *      involved. Multi-currency transactions are allowed (e.g. FX), but each
 *      currency must balance independently.
 *   3. Every entry's account currency must match its amount currency.
 *   4. Every amount must be positive (side encodes direction, not sign).
 *   5. Description is non-empty after trim.
 *
 * Construction is total via `Result`. No mutation post-construction.
 */
export class LedgerEntry {
  constructor(
    public readonly account: AccountRef,
    public readonly side: EntrySide,
    public readonly amount: Money,
    public readonly memo: string | undefined,
  ) {
    Object.freeze(this);
  }
}

export class Transaction {
  private constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public readonly occurredAt: Date,
    public readonly description: string,
    public readonly entries: readonly LedgerEntry[],
    public readonly externalRef: string | undefined,
  ) {
    Object.freeze(this);
  }

  static get TransactionIdGenerator(): () => string {
    return defaultIdGenerator;
  }

  /**
   * Validates a transaction input and constructs a `Transaction`. ID is generated
   * by the supplied generator (default: cryptographically random UUID v4).
   */
  static create(
    input: TransactionInput,
    idGenerator: () => string = defaultIdGenerator,
  ): Result<Transaction, LedgerError> {
    if (input.description.trim().length === 0) {
      return err(new InvalidEntryError('Transaction description cannot be empty'));
    }
    if (input.workspaceId.trim().length === 0) {
      return err(new InvalidEntryError('Transaction workspaceId cannot be empty'));
    }
    if (Number.isNaN(input.occurredAt.getTime())) {
      return err(new InvalidEntryError('Transaction occurredAt must be a valid Date'));
    }
    if (input.entries.length === 0) {
      return err(new EmptyTransactionError('Transaction must have at least one entry'));
    }

    let hasDebit = false;
    let hasCredit = false;
    const entries: LedgerEntry[] = [];
    for (const entry of input.entries) {
      const validation = validateEntry(entry);
      if (!validation.ok) return validation;
      entries.push(validation.value);
      if (entry.side === 'debit') hasDebit = true;
      else hasCredit = true;
    }

    if (!hasDebit || !hasCredit) {
      return err(
        new EmptyTransactionError('Transaction must have at least one debit and one credit'),
      );
    }

    const balanceCheck = checkPerCurrencyBalance(entries);
    if (!balanceCheck.ok) return balanceCheck;

    return ok(
      new Transaction(
        idGenerator(),
        input.workspaceId,
        input.occurredAt,
        input.description.trim(),
        Object.freeze(entries.slice()),
        input.externalRef,
      ),
    );
  }

  /**
   * Returns the total debit amount for the given currency. Zero if no entries
   * in that currency. Useful for reports and reconciliation.
   */
  debitTotal<C extends CurrencyCode>(currency: C): Money<C> {
    return totalForSide(this.entries, currency, 'debit');
  }

  creditTotal<C extends CurrencyCode>(currency: C): Money<C> {
    return totalForSide(this.entries, currency, 'credit');
  }

  /**
   * The set of currencies referenced by entries in this transaction.
   */
  currencies(): readonly CurrencyCode[] {
    const set = new Set<CurrencyCode>();
    for (const e of this.entries) set.add(e.amount.currency);
    return Array.from(set);
  }
}

function validateEntry(entry: EntryInput): Result<LedgerEntry, LedgerError> {
  if (entry.account.id.trim().length === 0) {
    return err(new InvalidEntryError('Entry account.id cannot be empty'));
  }
  if (entry.account.currency !== entry.amount.currency) {
    return err(
      new InvalidEntryError(
        `Entry currency mismatch: account=${entry.account.currency} amount=${entry.amount.currency}`,
      ),
    );
  }
  if (entry.amount.isZero()) {
    return err(new InvalidEntryError('Entry amount cannot be zero'));
  }
  if (entry.amount.isNegative()) {
    return err(
      new InvalidEntryError('Entry amount must be positive; use side to encode direction'),
    );
  }
  return ok(new LedgerEntry(entry.account, entry.side, entry.amount, entry.memo));
}

function checkPerCurrencyBalance(entries: readonly LedgerEntry[]): Result<true, LedgerError> {
  const totals = new Map<CurrencyCode, { debit: bigint; credit: bigint }>();
  for (const e of entries) {
    const cur = e.amount.currency;
    const t = totals.get(cur) ?? { debit: 0n, credit: 0n };
    if (e.side === 'debit') t.debit += e.amount.minor;
    else t.credit += e.amount.minor;
    totals.set(cur, t);
  }
  for (const [currency, t] of totals) {
    if (t.debit !== t.credit) {
      const d = Money.fromMinor(t.debit, currency).toString();
      const c = Money.fromMinor(t.credit, currency).toString();
      return err(new UnbalancedTransactionError(currency, d, c));
    }
  }
  return ok(true);
}

function totalForSide<C extends CurrencyCode>(
  entries: readonly LedgerEntry[],
  currency: C,
  side: EntrySide,
): Money<C> {
  let total = 0n;
  for (const e of entries) {
    if (e.amount.currency === currency && e.side === side) {
      total += e.amount.minor;
    }
  }
  return Money.fromMinor(total, currency);
}

function defaultIdGenerator(): string {
  return crypto.randomUUID();
}
