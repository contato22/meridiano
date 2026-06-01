import { AWQ, WORKSPACES, getAccounts, getLedger } from '@/lib/server/repositories';

export default async function DashboardPage() {
  const accounts = getAccounts().all();
  const ledger = getLedger();
  const txCount = ledger.saved.length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-wide text-zinc-500">Organização</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{AWQ.orgName}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Modo dev — dados in-memory. Substituído por Supabase + Clerk quando as credenciais forem
          configuradas.
        </p>
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Workspaces</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WORKSPACES.map((w) => {
            const wsAccounts = accounts.filter((a) => a.workspaceId === w.id);
            return (
              <div
                key={w.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="font-medium">{w.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{w.slug}</p>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {wsAccounts.length} {wsAccounts.length === 1 ? 'conta' : 'contas'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:max-w-md">
        <Stat label="Contas" value={String(accounts.length)} />
        <Stat label="Transações" value={String(txCount)} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
