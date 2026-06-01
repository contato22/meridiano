import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WORKSPACES, getAccounts, getLedger } from '@/lib/server/repositories';

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = params.workspace ?? WORKSPACES[0]?.id ?? '';
  const ledger = getLedger();
  const accountsById = new Map(
    getAccounts()
      .all()
      .map((a) => [a.id, a]),
  );
  const page = await ledger.list({ workspaceId });
  const items = page.items;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Razão</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Transações registradas, mais recentes primeiro.
          </p>
        </div>
        <Link href="/transactions/new">
          <Button>Nova transação</Button>
        </Link>
      </div>

      <nav className="flex flex-wrap gap-2">
        {WORKSPACES.map((w) => {
          const active = w.id === workspaceId;
          return (
            <Link
              key={w.id}
              href={`/ledger?workspace=${w.id}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                active
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                  : 'border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              {w.name}
            </Link>
          );
        })}
      </nav>

      {items.length === 0 && (
        <p className="rounded border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nenhuma transação neste workspace.
        </p>
      )}

      <div className="space-y-3">
        {items.map((tx) => (
          <article
            key={tx.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <header className="mb-2 flex items-baseline justify-between">
              <div>
                <p className="font-medium">{tx.description}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {tx.occurredAt.toLocaleDateString('pt-BR')}
                  {tx.externalRef ? ` · ${tx.externalRef}` : ''}
                </p>
              </div>
              <code className="text-xs text-zinc-400">{tx.id.slice(0, 8)}</code>
            </header>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tx.entries.map((e, i) => {
                  const acc = accountsById.get(e.account.id);
                  return (
                    <tr key={i}>
                      <td className="py-1 font-mono text-xs text-zinc-500">{acc?.code ?? '?'}</td>
                      <td className="py-1">{acc?.name ?? e.account.id}</td>
                      <td className="py-1 text-right font-mono text-xs">
                        {e.side === 'debit' ? 'D' : 'C'}
                      </td>
                      <td className="py-1 text-right font-mono tabular-nums">
                        {e.amount.format('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </article>
        ))}
      </div>
    </div>
  );
}
