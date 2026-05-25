import { describe, expect, it } from 'vitest';
import { Money, Transaction } from '@meridiano/domain';
import { getTransactionsByWorkspace } from '../src/queries/index.js';
import { InMemoryLedgerRepository } from './fakes.js';

function makeTx(workspaceId: string, occurredAt: Date, id: string): Transaction {
  const r = Transaction.create(
    {
      workspaceId,
      occurredAt,
      description: `tx ${id}`,
      entries: [
        {
          account: { id: 'd', currency: 'BRL' },
          side: 'debit',
          amount: Money.parseUnsafe('100.00', 'BRL'),
        },
        {
          account: { id: 'c', currency: 'BRL' },
          side: 'credit',
          amount: Money.parseUnsafe('100.00', 'BRL'),
        },
      ],
    },
    () => id,
  );
  if (!r.ok) throw r.error;
  return r.value;
}

describe('getTransactionsByWorkspace', () => {
  it('returns transactions for the workspace', async () => {
    const ledger = new InMemoryLedgerRepository();
    await ledger.save(makeTx('ws-1', new Date('2026-01-01'), 'a'));
    await ledger.save(makeTx('ws-1', new Date('2026-02-01'), 'b'));
    await ledger.save(makeTx('ws-2', new Date('2026-01-15'), 'c'));

    const page = await getTransactionsByWorkspace({ workspaceId: 'ws-1' }, { ledger });
    expect(page.items.map((t) => t.id).sort()).toEqual(['a', 'b']);
    expect(page.nextCursor).toBeNull();
  });

  it('filters by date range', async () => {
    const ledger = new InMemoryLedgerRepository();
    await ledger.save(makeTx('ws-1', new Date('2026-01-01'), 'a'));
    await ledger.save(makeTx('ws-1', new Date('2026-02-01'), 'b'));
    await ledger.save(makeTx('ws-1', new Date('2026-03-01'), 'c'));

    const page = await getTransactionsByWorkspace(
      { workspaceId: 'ws-1', from: new Date('2026-01-15'), to: new Date('2026-02-15') },
      { ledger },
    );
    expect(page.items.map((t) => t.id)).toEqual(['b']);
  });

  it('returns empty page when no transactions match', async () => {
    const ledger = new InMemoryLedgerRepository();
    const page = await getTransactionsByWorkspace({ workspaceId: 'ws-empty' }, { ledger });
    expect(page.items).toHaveLength(0);
    expect(page.nextCursor).toBeNull();
  });
});
