import { beforeEach, describe, expect, it } from 'vitest';
import { AccountNotFoundError } from '../src/ports/index.js';
import { InvalidEntryError, UnbalancedTransactionError } from '@meridiano/domain';
import { recordTransaction, type RecordTransactionDeps } from '../src/commands/index.js';
import {
  FixedClock,
  InMemoryAccountRepository,
  InMemoryLedgerRepository,
  SequentialIdGenerator,
} from './fakes.js';

const FIXED_NOW = new Date('2026-02-01T12:00:00Z');

const seedAccounts = [
  {
    id: 'acc-caixa',
    workspaceId: 'ws-1',
    code: '1.1.01',
    name: 'Caixa',
    currency: 'BRL' as const,
    type: 'asset' as const,
    archivedAt: null,
  },
  {
    id: 'acc-despesas',
    workspaceId: 'ws-1',
    code: '4.1.01',
    name: 'Despesas de Aluguel',
    currency: 'BRL' as const,
    type: 'expense' as const,
    archivedAt: null,
  },
  {
    id: 'acc-archived',
    workspaceId: 'ws-1',
    code: '9.9.99',
    name: 'Conta arquivada',
    currency: 'BRL' as const,
    type: 'expense' as const,
    archivedAt: new Date('2025-01-01'),
  },
  {
    id: 'acc-caixa-usd',
    workspaceId: 'ws-1',
    code: '1.1.02',
    name: 'Caixa USD',
    currency: 'USD' as const,
    type: 'asset' as const,
    archivedAt: null,
  },
];

let deps: RecordTransactionDeps;
let ledger: InMemoryLedgerRepository;

beforeEach(() => {
  ledger = new InMemoryLedgerRepository();
  deps = {
    accounts: new InMemoryAccountRepository(seedAccounts),
    ledger,
    clock: new FixedClock(FIXED_NOW),
    idGenerator: new SequentialIdGenerator(),
  };
});

describe('recordTransaction — happy path', () => {
  it('records a balanced BRL transaction via decimal input', async () => {
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: 'Pagamento aluguel fev/2026',
        entries: [
          { accountId: 'acc-despesas', side: 'debit', amount: { decimal: '5000.00' } },
          { accountId: 'acc-caixa', side: 'credit', amount: { decimal: '5000.00' } },
        ],
      },
      deps,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id).toBe('tx-0001');
      expect(r.value.occurredAt).toEqual(FIXED_NOW);
      expect(r.value.debitTotal('BRL').toString()).toBe('5000.00');
    }
    expect(ledger.saved).toHaveLength(1);
  });

  it('records a balanced transaction via minor-units input', async () => {
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: 'Recebimento',
        entries: [
          {
            accountId: 'acc-caixa',
            side: 'debit',
            amount: { minor: '100000', currency: 'BRL' },
          },
          {
            accountId: 'acc-despesas',
            side: 'credit',
            amount: { minor: '100000', currency: 'BRL' },
          },
        ],
      },
      deps,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.debitTotal('BRL').toString()).toBe('1000.00');
  });

  it('uses caller-supplied occurredAt when provided', async () => {
    const occurredAt = new Date('2026-01-10T08:00:00Z');
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        occurredAt,
        description: 'Pagamento retroativo',
        entries: [
          { accountId: 'acc-despesas', side: 'debit', amount: { decimal: '100.00' } },
          { accountId: 'acc-caixa', side: 'credit', amount: { decimal: '100.00' } },
        ],
      },
      deps,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.occurredAt).toEqual(occurredAt);
  });

  it('preserves externalRef', async () => {
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: 'Pagamento',
        externalRef: 'NF-2026-007',
        entries: [
          { accountId: 'acc-despesas', side: 'debit', amount: { decimal: '50.00' } },
          { accountId: 'acc-caixa', side: 'credit', amount: { decimal: '50.00' } },
        ],
      },
      deps,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.externalRef).toBe('NF-2026-007');
  });

  it('deduplicates account lookups', async () => {
    let observedIds: readonly string[] = [];
    class ObservingRepo extends InMemoryAccountRepository {
      override findManyByIds(ids: readonly string[]) {
        observedIds = ids;
        return super.findManyByIds(ids);
      }
    }
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: 'Recebimento',
        entries: [
          { accountId: 'acc-caixa', side: 'debit', amount: { decimal: '50.00' } },
          { accountId: 'acc-despesas', side: 'credit', amount: { decimal: '50.00' } },
        ],
      },
      { ...deps, accounts: new ObservingRepo(seedAccounts) },
    );
    expect(r.ok).toBe(true);
    expect(observedIds).toHaveLength(2);
    expect(new Set(observedIds).size).toBe(2);
  });
});

describe('recordTransaction — validation', () => {
  it('rejects when account does not exist', async () => {
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: 'Pagamento',
        entries: [
          { accountId: 'acc-unknown', side: 'debit', amount: { decimal: '100.00' } },
          { accountId: 'acc-caixa', side: 'credit', amount: { decimal: '100.00' } },
        ],
      },
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(AccountNotFoundError);
    expect(ledger.saved).toHaveLength(0);
  });

  it('rejects when account is archived', async () => {
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: 'Pagamento',
        entries: [
          { accountId: 'acc-archived', side: 'debit', amount: { decimal: '100.00' } },
          { accountId: 'acc-caixa', side: 'credit', amount: { decimal: '100.00' } },
        ],
      },
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidEntryError);
    expect(ledger.saved).toHaveLength(0);
  });

  it('rejects when minor-units currency does not match account currency', async () => {
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: 'Pagamento',
        entries: [
          {
            accountId: 'acc-caixa',
            side: 'debit',
            amount: { minor: '10000', currency: 'USD' },
          },
          {
            accountId: 'acc-despesas',
            side: 'credit',
            amount: { minor: '10000', currency: 'BRL' },
          },
        ],
      },
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidEntryError);
  });

  it('rejects malformed decimal amount', async () => {
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: 'Pagamento',
        entries: [
          { accountId: 'acc-caixa', side: 'debit', amount: { decimal: 'not-a-number' } },
          { accountId: 'acc-despesas', side: 'credit', amount: { decimal: '100.00' } },
        ],
      },
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidEntryError);
  });

  it('rejects malformed minor amount', async () => {
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: 'Pagamento',
        entries: [
          {
            accountId: 'acc-caixa',
            side: 'debit',
            amount: { minor: '12.5', currency: 'BRL' },
          },
          { accountId: 'acc-despesas', side: 'credit', amount: { decimal: '0.13' } },
        ],
      },
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidEntryError);
  });

  it('propagates UnbalancedTransactionError from domain', async () => {
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: 'Pagamento',
        entries: [
          { accountId: 'acc-despesas', side: 'debit', amount: { decimal: '500.00' } },
          { accountId: 'acc-caixa', side: 'credit', amount: { decimal: '400.00' } },
        ],
      },
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(UnbalancedTransactionError);
    expect(ledger.saved).toHaveLength(0);
  });

  it('does not persist when domain validation fails', async () => {
    await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: '   ',
        entries: [
          { accountId: 'acc-despesas', side: 'debit', amount: { decimal: '500.00' } },
          { accountId: 'acc-caixa', side: 'credit', amount: { decimal: '500.00' } },
        ],
      },
      deps,
    );
    expect(ledger.saved).toHaveLength(0);
  });
});

describe('recordTransaction — multi-currency', () => {
  it('records a multi-currency transaction where each currency balances', async () => {
    const r = await recordTransaction(
      {
        workspaceId: 'ws-1',
        description: 'Conversão FX',
        entries: [
          { accountId: 'acc-caixa', side: 'debit', amount: { decimal: '500.00' } },
          { accountId: 'acc-despesas', side: 'credit', amount: { decimal: '500.00' } },
          { accountId: 'acc-caixa-usd', side: 'debit', amount: { decimal: '100.00' } },
          { accountId: 'acc-caixa-usd', side: 'credit', amount: { decimal: '100.00' } },
        ],
      },
      deps,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect([...r.value.currencies()].sort()).toEqual(['BRL', 'USD']);
    }
  });
});
