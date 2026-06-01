import { NewTransactionForm } from '@/components/forms/new-transaction-form';
import { WORKSPACES, getAccounts } from '@/lib/server/repositories';

export default function NewTransactionPage() {
  const accounts = getAccounts()
    .all()
    .filter((a) => a.archivedAt === null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova transação</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Lançamento double-entry. A soma dos débitos precisa igualar a soma dos créditos, por
          moeda.
        </p>
      </div>
      <NewTransactionForm
        workspaces={WORKSPACES}
        accounts={accounts.map((a) => ({
          id: a.id,
          workspaceId: a.workspaceId,
          code: a.code,
          name: a.name,
          currency: a.currency,
        }))}
      />
    </div>
  );
}
