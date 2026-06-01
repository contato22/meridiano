import 'server-only';
import { Money, type CurrencyCode } from '@meridiano/domain';
import { getLedger } from './repositories';
import type { Account } from '@meridiano/application';

/**
 * Compute the signed running balance for an account by scanning every
 * persisted transaction. Mirrors what migration 0012's trigger does in
 * Postgres — assets/expenses grow on debits, liabilities/equity/revenue
 * grow on credits.
 *
 * O(N) per call; fine for dev mode with the in-memory store. Drizzle adapter
 * will read directly from `account_balances` once PR-F lands.
 */
export function computeBalanceMinor(account: Account): bigint {
  const ledger = getLedger();
  const naturalDebit = account.type === 'asset' || account.type === 'expense';
  let acc = 0n;
  for (const tx of ledger.saved) {
    for (const entry of tx.entries) {
      if (entry.account.id !== account.id) continue;
      const m = entry.amount.minor;
      if (entry.side === 'debit') acc += naturalDebit ? m : -m;
      else acc += naturalDebit ? -m : m;
    }
  }
  return acc;
}

export function balanceMoney(account: Account): Money {
  return Money.fromMinor(computeBalanceMinor(account), account.currency as CurrencyCode);
}
