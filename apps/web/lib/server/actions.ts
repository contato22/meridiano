'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  recordTransaction,
  type Account,
  type RecordTransactionInput,
} from '@meridiano/application';
import { isCurrencyCode } from '@meridiano/domain';
import { getRepositories, getAccounts } from './repositories';

export interface ActionResult<T> {
  readonly ok: boolean;
  readonly error?: string;
  readonly data?: T;
}

const accountSchema = z.object({
  workspaceId: z.string().min(1, 'workspace required'),
  code: z.string().min(1, 'code required').max(50),
  name: z.string().min(1, 'name required').max(255),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  currency: z
    .string()
    .length(3)
    .refine((c) => isCurrencyCode(c), { message: 'unsupported currency' }),
});

export async function createAccount(input: unknown): Promise<ActionResult<Account>> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  if (!isCurrencyCode(parsed.data.currency)) {
    return { ok: false, error: 'invalid currency' };
  }
  const accounts = getAccounts();
  const existing = await accounts.listByWorkspace(parsed.data.workspaceId);
  if (existing.some((a) => a.code === parsed.data.code)) {
    return {
      ok: false,
      error: `account code ${parsed.data.code} already exists in this workspace`,
    };
  }
  const newAccount: Account = {
    id: crypto.randomUUID(),
    workspaceId: parsed.data.workspaceId,
    code: parsed.data.code,
    name: parsed.data.name,
    type: parsed.data.type,
    currency: parsed.data.currency,
    archivedAt: null,
  };
  accounts.add(newAccount);
  revalidatePath('/accounts');
  return { ok: true, data: newAccount };
}

const entrySchema = z.object({
  accountId: z.string().min(1),
  side: z.enum(['debit', 'credit']),
  decimal: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, { message: 'amount must be a decimal like "100.00"' }),
  memo: z.string().optional(),
});

const transactionSchema = z.object({
  workspaceId: z.string().min(1, 'workspace required'),
  description: z.string().min(1, 'description required').max(500),
  occurredAt: z.string().min(1, 'date required'),
  externalRef: z.string().max(255).optional(),
  entries: z.array(entrySchema).min(2, 'need at least 2 entries'),
});

export async function postTransaction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  const { workspaceId, description, occurredAt, externalRef, entries } = parsed.data;
  const when = new Date(occurredAt);
  if (Number.isNaN(when.getTime())) {
    return { ok: false, error: 'invalid date' };
  }

  const input2: RecordTransactionInput = {
    workspaceId,
    description,
    occurredAt: when,
    ...(externalRef !== undefined && externalRef.length > 0 ? { externalRef } : {}),
    entries: entries.map((e) => ({
      accountId: e.accountId,
      side: e.side,
      amount: { decimal: e.decimal },
      ...(e.memo !== undefined && e.memo.length > 0 ? { memo: e.memo } : {}),
    })),
  };

  const repos = getRepositories();
  const result = await recordTransaction(input2, repos);
  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }
  revalidatePath('/ledger');
  revalidatePath('/accounts');
  return { ok: true, data: { id: result.value.id } };
}
