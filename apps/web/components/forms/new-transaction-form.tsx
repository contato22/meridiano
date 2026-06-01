'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { postTransaction } from '@/lib/server/actions';

interface AccountOpt {
  id: string;
  workspaceId: string;
  code: string;
  name: string;
  currency: string;
}

interface WorkspaceOpt {
  id: string;
  name: string;
}

interface Line {
  accountId: string;
  side: 'debit' | 'credit';
  decimal: string;
  memo: string;
}

const emptyLine = (side: 'debit' | 'credit'): Line => ({
  accountId: '',
  side,
  decimal: '',
  memo: '',
});

function todayLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseMinor(decimal: string): bigint | null {
  if (!/^-?\d+(\.\d+)?$/.test(decimal.trim())) return null;
  const neg = decimal.trim().startsWith('-');
  const unsigned = neg ? decimal.trim().slice(1) : decimal.trim();
  const [intPart, fracPart = ''] = unsigned.split('.');
  const padded = (fracPart + '00').slice(0, 2);
  const combined = `${intPart}${padded}`;
  try {
    const v = BigInt(combined);
    return neg ? -v : v;
  } catch {
    return null;
  }
}

export function NewTransactionForm({
  workspaces,
  accounts,
}: {
  workspaces: readonly WorkspaceOpt[];
  accounts: readonly AccountOpt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(todayLocal());
  const [externalRef, setExternalRef] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine('debit'), emptyLine('credit')]);

  const workspaceAccounts = useMemo(
    () => accounts.filter((a) => a.workspaceId === workspaceId),
    [accounts, workspaceId],
  );

  const totals = useMemo(() => {
    let debit = 0n;
    let credit = 0n;
    for (const line of lines) {
      const m = parseMinor(line.decimal);
      if (m === null) continue;
      if (line.side === 'debit') debit += m;
      else credit += m;
    }
    return { debit, credit, diff: debit - credit };
  }, [lines]);

  const balanced = totals.diff === 0n && totals.debit > 0n;

  function updateLine(i: number, patch: Partial<Line>): void {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function addLine(side: 'debit' | 'credit'): void {
    setLines((prev) => [...prev, emptyLine(side)]);
  }

  function removeLine(i: number): void {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setError(null);
    if (!balanced) {
      setError('A soma dos débitos precisa ser igual à soma dos créditos.');
      return;
    }
    startTransition(async () => {
      const payload = {
        workspaceId,
        description,
        occurredAt,
        externalRef: externalRef || undefined,
        entries: lines.map((l) => ({
          accountId: l.accountId,
          side: l.side,
          decimal: l.decimal,
          memo: l.memo || undefined,
        })),
      };
      const r = await postTransaction(payload);
      if (!r.ok) {
        setError(r.error ?? 'falha ao registrar transação');
        return;
      }
      router.push('/ledger');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Workspace">
          <select
            className={inputClass}
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data">
          <input
            type="date"
            className={inputClass}
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
          />
        </Field>
        <Field label="Descrição" full>
          <input
            className={inputClass}
            value={description}
            placeholder="Pagamento aluguel fev/2026"
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Field>
        <Field label="Referência externa (opcional)" full>
          <input
            className={inputClass}
            value={externalRef}
            placeholder="NF-2026-007"
            onChange={(e) => setExternalRef(e.target.value)}
          />
        </Field>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Lançamentos
          </h2>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => addLine('debit')}>
              + Débito
            </Button>
            <Button type="button" variant="secondary" onClick={() => addLine('credit')}>
              + Crédito
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {lines.map((line, i) => (
            <LineRow
              key={i}
              line={line}
              accounts={workspaceAccounts}
              onChange={(patch) => updateLine(i, patch)}
              onRemove={() => removeLine(i)}
              canRemove={lines.length > 2}
            />
          ))}
        </div>

        <BalanceBar
          debit={totals.debit}
          credit={totals.credit}
          diff={totals.diff}
          balanced={balanced}
        />
      </section>

      {error && (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !balanced}>
          {pending ? 'Registrando…' : 'Registrar transação'}
        </Button>
      </div>
    </form>
  );
}

function LineRow({
  line,
  accounts,
  onChange,
  onRemove,
  canRemove,
}: {
  line: Line;
  accounts: readonly AccountOpt[];
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="grid grid-cols-12 items-end gap-2 rounded border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="col-span-2">
        <select
          className={inputClass}
          value={line.side}
          onChange={(e) => onChange({ side: e.target.value as Line['side'] })}
        >
          <option value="debit">Débito</option>
          <option value="credit">Crédito</option>
        </select>
      </div>
      <div className="col-span-5">
        <select
          className={inputClass}
          value={line.accountId}
          onChange={(e) => onChange({ accountId: e.target.value })}
          required
        >
          <option value="">Selecione uma conta…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} — {a.name} ({a.currency})
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <input
          className={`${inputClass} text-right font-mono tabular-nums`}
          placeholder="0,00"
          value={line.decimal}
          onChange={(e) => onChange({ decimal: e.target.value })}
          required
          inputMode="decimal"
        />
      </div>
      <div className="col-span-2">
        <input
          className={inputClass}
          placeholder="memo"
          value={line.memo}
          onChange={(e) => onChange({ memo: e.target.value })}
        />
      </div>
      <div className="col-span-1 text-right">
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-zinc-500 hover:text-rose-600"
            aria-label="remover linha"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function BalanceBar({
  debit,
  credit,
  diff,
  balanced,
}: {
  debit: bigint;
  credit: bigint;
  diff: bigint;
  balanced: boolean;
}) {
  const fmt = (m: bigint): string => {
    const neg = m < 0n;
    const abs = neg ? -m : m;
    const s = abs.toString().padStart(3, '0');
    return `${neg ? '-' : ''}${s.slice(0, -2)},${s.slice(-2)}`;
  };
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-4 py-2 text-sm ${
        balanced
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
          : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
      }`}
    >
      <span className="font-medium">
        {balanced
          ? '✓ Balanceada'
          : diff > 0n
            ? `Débito excede crédito em ${fmt(diff)}`
            : `Crédito excede débito em ${fmt(-diff)}`}
      </span>
      <span className="font-mono text-xs tabular-nums">
        D {fmt(debit)} / C {fmt(credit)}
      </span>
    </div>
  );
}

function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900';
