import Link from 'next/link';
import { WORKSPACES, getAccounts } from '@/lib/server/repositories';
import { balanceMoney } from '@/lib/server/balances';
import { Button } from '@/components/ui/button';

export default async function AccountsPage() {
  const all = getAccounts().all();
  const byWorkspace = WORKSPACES.map((w) => ({
    workspace: w,
    accounts: all.filter((a) => a.workspaceId === w.id),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Plano de contas por workspace, com saldos correntes.
          </p>
        </div>
        <Link href="/accounts/new">
          <Button>Nova conta</Button>
        </Link>
      </div>

      {byWorkspace
        .filter(({ accounts }) => accounts.length > 0)
        .map(({ workspace, accounts }) => (
          <section key={workspace.id} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {workspace.name}
            </h2>
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <Th>Código</Th>
                    <Th>Nome</Th>
                    <Th>Tipo</Th>
                    <Th align="right">Saldo</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                  {accounts.map((a) => (
                    <tr key={a.id}>
                      <Td mono>{a.code}</Td>
                      <Td>{a.name}</Td>
                      <Td>
                        <TypeBadge type={a.type} />
                      </Td>
                      <Td align="right" mono>
                        {balanceMoney(a).format('pt-BR')}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

      {byWorkspace.every(({ accounts }) => accounts.length === 0) && (
        <p className="text-sm text-zinc-500">Nenhuma conta cadastrada ainda.</p>
      )}
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  mono = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  mono?: boolean;
}) {
  return (
    <td
      className={`px-4 py-2 ${align === 'right' ? 'text-right' : 'text-left'} ${mono ? 'font-mono tabular-nums' : ''}`}
    >
      {children}
    </td>
  );
}

const TYPE_LABELS = {
  asset: 'Ativo',
  liability: 'Passivo',
  equity: 'PL',
  revenue: 'Receita',
  expense: 'Despesa',
} as const;

const TYPE_COLORS = {
  asset: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  liability: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  equity: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  revenue: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  expense: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
} as const;

function TypeBadge({ type }: { type: keyof typeof TYPE_LABELS }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${TYPE_COLORS[type]}`}>
      {TYPE_LABELS[type]}
    </span>
  );
}
