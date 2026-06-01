'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createAccount } from '@/lib/server/actions';

interface WorkspaceOption {
  id: string;
  name: string;
}

export function NewAccountForm({ workspaces }: { workspaces: readonly WorkspaceOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    workspaceId: workspaces[0]?.id ?? '',
    code: '',
    name: '',
    type: 'asset' as const,
    currency: 'BRL',
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createAccount(form);
      if (!result.ok) {
        setError(result.error ?? 'falha ao criar conta');
        return;
      }
      router.push('/accounts');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <Field label="Workspace">
        <select
          required
          className={inputClass}
          value={form.workspaceId}
          onChange={(e) => setForm({ ...form, workspaceId: e.target.value })}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Código">
          <input
            required
            placeholder="1.1.01"
            className={`${inputClass} font-mono`}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </Field>
        <Field label="Moeda">
          <select
            className={inputClass}
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="JPY">JPY</option>
          </select>
        </Field>
        <Field label="Tipo">
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
          >
            <option value="asset">Ativo</option>
            <option value="liability">Passivo</option>
            <option value="equity">PL</option>
            <option value="revenue">Receita</option>
            <option value="expense">Despesa</option>
          </select>
        </Field>
      </div>

      <Field label="Nome">
        <input
          required
          placeholder="Caixa"
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>

      {error && (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Criando…' : 'Criar conta'}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900';
