import Link from 'next/link';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[16rem_1fr] bg-zinc-50 dark:bg-zinc-950">
      <aside className="border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/" className="text-lg font-semibold">
          Meridiano
        </Link>
        <nav className="mt-8 flex flex-col gap-2 text-sm">
          <Link
            href="/dashboard"
            className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/accounts"
            className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white"
          >
            Contas
          </Link>
          <Link href="/ledger" className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white">
            Razão
          </Link>
          <Link
            href="/transactions/new"
            className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white"
          >
            Nova transação
          </Link>
        </nav>
      </aside>
      <main className="p-8">{children}</main>
    </div>
  );
}
