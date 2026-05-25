import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { Money } from '../src/money/index.js';
import {
  EmptyTransactionError,
  InvalidEntryError,
  Transaction,
  UnbalancedTransactionError,
  type EntryInput,
  type TransactionInput,
} from '../src/ledger/index.js';

const acc = (id: string, currency: 'BRL' | 'USD' = 'BRL') => ({ id, currency });

const baseInput = (overrides: Partial<TransactionInput> = {}): TransactionInput => ({
  workspaceId: 'ws-1',
  occurredAt: new Date('2026-01-15T12:00:00Z'),
  description: 'Pagamento aluguel',
  entries: [
    {
      account: acc('despesas-aluguel'),
      side: 'debit',
      amount: Money.parseUnsafe('5000.00', 'BRL'),
    },
    {
      account: acc('caixa'),
      side: 'credit',
      amount: Money.parseUnsafe('5000.00', 'BRL'),
    },
  ],
  ...overrides,
});

const deterministicId = () => 'tx-test-001';

describe('Transaction — happy path', () => {
  it('builds a balanced single-currency transaction', () => {
    const r = Transaction.create(baseInput(), deterministicId);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id).toBe('tx-test-001');
      expect(r.value.description).toBe('Pagamento aluguel');
      expect(r.value.entries).toHaveLength(2);
      expect(r.value.debitTotal('BRL').toString()).toBe('5000.00');
      expect(r.value.creditTotal('BRL').toString()).toBe('5000.00');
      expect(r.value.currencies()).toEqual(['BRL']);
    }
  });

  it('trims description whitespace', () => {
    const r = Transaction.create(baseInput({ description: '  Pagamento  ' }), deterministicId);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.description).toBe('Pagamento');
  });

  it('preserves externalRef when provided', () => {
    const r = Transaction.create(baseInput({ externalRef: 'NF-2026-001' }), deterministicId);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.externalRef).toBe('NF-2026-001');
  });

  it('uses default UUID generator', () => {
    const r = Transaction.create(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    }
  });

  it('handles a 1-debit-N-credits transaction', () => {
    const r = Transaction.create(
      baseInput({
        entries: [
          {
            account: acc('despesas-folha'),
            side: 'debit',
            amount: Money.parseUnsafe('10000.00', 'BRL'),
          },
          {
            account: acc('salarios-pagar'),
            side: 'credit',
            amount: Money.parseUnsafe('8000.00', 'BRL'),
          },
          {
            account: acc('inss-pagar'),
            side: 'credit',
            amount: Money.parseUnsafe('1100.00', 'BRL'),
          },
          {
            account: acc('irrf-pagar'),
            side: 'credit',
            amount: Money.parseUnsafe('900.00', 'BRL'),
          },
        ],
      }),
      deterministicId,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.debitTotal('BRL').toString()).toBe('10000.00');
      expect(r.value.creditTotal('BRL').toString()).toBe('10000.00');
    }
  });

  it('handles multi-currency transaction with per-currency balance', () => {
    const r = Transaction.create(
      baseInput({
        entries: [
          { account: acc('caixa-brl'), side: 'debit', amount: Money.parseUnsafe('500.00', 'BRL') },
          {
            account: acc('receita-brl'),
            side: 'credit',
            amount: Money.parseUnsafe('500.00', 'BRL'),
          },
          {
            account: acc('caixa-usd', 'USD'),
            side: 'debit',
            amount: Money.parseUnsafe('100.00', 'USD'),
          },
          {
            account: acc('receita-usd', 'USD'),
            side: 'credit',
            amount: Money.parseUnsafe('100.00', 'USD'),
          },
        ],
      }),
      deterministicId,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect([...r.value.currencies()].sort()).toEqual(['BRL', 'USD']);
      expect(r.value.debitTotal('BRL').toString()).toBe('500.00');
      expect(r.value.debitTotal('USD').toString()).toBe('100.00');
    }
  });

  it('memo flows through to entry', () => {
    const r = Transaction.create(
      baseInput({
        entries: [
          {
            account: acc('despesas-aluguel'),
            side: 'debit',
            amount: Money.parseUnsafe('5000.00', 'BRL'),
            memo: 'fevereiro',
          },
          {
            account: acc('caixa'),
            side: 'credit',
            amount: Money.parseUnsafe('5000.00', 'BRL'),
          },
        ],
      }),
      deterministicId,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const debit = r.value.entries[0];
      expect(debit?.memo).toBe('fevereiro');
    }
  });
});

describe('Transaction — validation errors', () => {
  it('rejects empty description', () => {
    const r = Transaction.create(baseInput({ description: '   ' }), deterministicId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidEntryError);
  });

  it('rejects empty workspaceId', () => {
    const r = Transaction.create(baseInput({ workspaceId: '' }), deterministicId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidEntryError);
  });

  it('rejects invalid occurredAt', () => {
    const r = Transaction.create(
      baseInput({ occurredAt: new Date('not-a-date') }),
      deterministicId,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidEntryError);
  });

  it('rejects empty entries', () => {
    const r = Transaction.create(baseInput({ entries: [] }), deterministicId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(EmptyTransactionError);
  });

  it('rejects all-debit (no credit) transactions', () => {
    const r = Transaction.create(
      baseInput({
        entries: [
          {
            account: acc('a'),
            side: 'debit',
            amount: Money.parseUnsafe('100.00', 'BRL'),
          },
          {
            account: acc('b'),
            side: 'debit',
            amount: Money.parseUnsafe('100.00', 'BRL'),
          },
        ],
      }),
      deterministicId,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(EmptyTransactionError);
  });

  it('rejects unbalanced transaction', () => {
    const r = Transaction.create(
      baseInput({
        entries: [
          {
            account: acc('caixa'),
            side: 'debit',
            amount: Money.parseUnsafe('500.00', 'BRL'),
          },
          {
            account: acc('receita'),
            side: 'credit',
            amount: Money.parseUnsafe('400.00', 'BRL'),
          },
        ],
      }),
      deterministicId,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(UnbalancedTransactionError);
      const e = r.error as UnbalancedTransactionError;
      expect(e.currency).toBe('BRL');
      expect(e.debitTotal).toBe('500.00');
      expect(e.creditTotal).toBe('400.00');
    }
  });

  it('rejects when one currency balances but another does not', () => {
    const r = Transaction.create(
      baseInput({
        entries: [
          { account: acc('caixa'), side: 'debit', amount: Money.parseUnsafe('500.00', 'BRL') },
          { account: acc('receita'), side: 'credit', amount: Money.parseUnsafe('500.00', 'BRL') },
          {
            account: acc('caixa-usd', 'USD'),
            side: 'debit',
            amount: Money.parseUnsafe('100.00', 'USD'),
          },
          {
            account: acc('receita-usd', 'USD'),
            side: 'credit',
            amount: Money.parseUnsafe('99.00', 'USD'),
          },
        ],
      }),
      deterministicId,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(UnbalancedTransactionError);
      expect((r.error as UnbalancedTransactionError).currency).toBe('USD');
    }
  });

  it('rejects entry where account currency != amount currency', () => {
    const bad: EntryInput = {
      account: acc('caixa-usd', 'USD'),
      side: 'debit',
      amount: Money.parseUnsafe('500.00', 'BRL'),
    };
    const r = Transaction.create(
      baseInput({
        entries: [
          bad,
          { account: acc('rec'), side: 'credit', amount: Money.parseUnsafe('500.00', 'BRL') },
        ],
      }),
      deterministicId,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidEntryError);
  });

  it('rejects zero-amount entry', () => {
    const r = Transaction.create(
      baseInput({
        entries: [
          { account: acc('a'), side: 'debit', amount: Money.zero('BRL') },
          { account: acc('b'), side: 'credit', amount: Money.zero('BRL') },
        ],
      }),
      deterministicId,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidEntryError);
  });

  it('rejects negative amount (sign must come from side)', () => {
    const r = Transaction.create(
      baseInput({
        entries: [
          {
            account: acc('a'),
            side: 'debit',
            amount: Money.parseUnsafe('-100.00', 'BRL'),
          },
          {
            account: acc('b'),
            side: 'credit',
            amount: Money.parseUnsafe('100.00', 'BRL'),
          },
        ],
      }),
      deterministicId,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidEntryError);
  });

  it('rejects entry with empty account.id', () => {
    const r = Transaction.create(
      baseInput({
        entries: [
          { account: acc(''), side: 'debit', amount: Money.parseUnsafe('100.00', 'BRL') },
          { account: acc('b'), side: 'credit', amount: Money.parseUnsafe('100.00', 'BRL') },
        ],
      }),
      deterministicId,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidEntryError);
  });
});

describe('Transaction — property-based', () => {
  it('any balanced 2-leg transaction succeeds', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10n ** 12n }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (minor, descRaw) => {
          const description = descRaw.trim();
          if (description.length === 0) return;
          const amount = Money.fromMinor(minor, 'BRL');
          const r = Transaction.create(
            baseInput({
              description,
              entries: [
                { account: acc('debit'), side: 'debit', amount },
                { account: acc('credit'), side: 'credit', amount },
              ],
            }),
            deterministicId,
          );
          expect(r.ok).toBe(true);
        },
      ),
    );
  });

  it('any N-leg split where credits sum to debit total balances', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 100n, max: 10n ** 10n }),
        fc.integer({ min: 2, max: 10 }),
        (totalMinor, parts) => {
          // Ensure totalMinor >= parts so allocate never produces zero slices
          // (zero-amount entries are correctly rejected by Transaction.create).
          if (totalMinor < BigInt(parts)) return;
          const total = Money.fromMinor(totalMinor, 'BRL');
          const credits = total.allocate(parts);
          const entries: EntryInput[] = [
            { account: acc('debit'), side: 'debit', amount: total },
            ...credits.map((c, i) => ({
              account: acc(`credit-${String(i)}`),
              side: 'credit' as const,
              amount: c,
            })),
          ];
          const r = Transaction.create(baseInput({ entries }), deterministicId);
          expect(r.ok).toBe(true);
        },
      ),
    );
  });
});

describe('Transaction — immutability', () => {
  it('entries array is frozen', () => {
    const r = Transaction.create(baseInput(), deterministicId);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.isFrozen(r.value)).toBe(true);
      expect(Object.isFrozen(r.value.entries)).toBe(true);
    }
  });

  it('mutating the input entries does not affect the transaction', () => {
    const entries: EntryInput[] = [
      { account: acc('a'), side: 'debit', amount: Money.parseUnsafe('100.00', 'BRL') },
      { account: acc('b'), side: 'credit', amount: Money.parseUnsafe('100.00', 'BRL') },
    ];
    const r = Transaction.create(baseInput({ entries }), deterministicId);
    expect(r.ok).toBe(true);
    // Caller mutates their copy
    entries.pop();
    if (r.ok) expect(r.value.entries).toHaveLength(2);
  });
});
