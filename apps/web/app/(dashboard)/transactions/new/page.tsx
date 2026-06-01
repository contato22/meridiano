export default function NewTransactionPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Nova transação</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Stub — formulário double-entry virá em PR-C, consumindo{' '}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">ledger.recordTransaction</code>{' '}
        via tRPC.
      </p>
    </div>
  );
}
