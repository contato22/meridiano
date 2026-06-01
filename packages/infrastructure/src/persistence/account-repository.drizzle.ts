import { eq, inArray, type ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { AccountNotFoundError, type Account, type AccountRepository } from '@meridiano/application';
import { isCurrencyCode, err, ok, type Result } from '@meridiano/domain';
import { schema } from '@meridiano/db';

type AnyPgDatabase = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Drizzle-backed AccountRepository. Constructor accepts any Drizzle pg
 * client — postgres-js (prod) or pglite (tests) — both extend `PgDatabase`.
 */
export class DrizzleAccountRepository implements AccountRepository {
  constructor(private readonly db: AnyPgDatabase) {}

  async findById(id: string): Promise<Result<Account, AccountNotFoundError>> {
    const rows = await this.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return err(new AccountNotFoundError(id));
    const acc = toAccount(row);
    return acc ? ok(acc) : err(new AccountNotFoundError(id));
  }

  async findManyByIds(ids: readonly string[]): Promise<readonly Account[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(schema.accounts)
      .where(inArray(schema.accounts.id, [...ids]));
    return rows.map(toAccount).filter((a): a is Account => a !== null);
  }

  async listByWorkspace(workspaceId: string): Promise<readonly Account[]> {
    const rows = await this.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.workspaceId, workspaceId));
    return rows.map(toAccount).filter((a): a is Account => a !== null);
  }
}

function toAccount(row: typeof schema.accounts.$inferSelect): Account | null {
  if (!isCurrencyCode(row.currency)) return null;
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    code: row.code,
    name: row.name,
    currency: row.currency,
    type: row.type,
    archivedAt: row.archivedAt,
  };
}
