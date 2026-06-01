import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-500">AWQ Group</p>
        <h1 className="mt-1 text-5xl font-semibold tracking-tight">Meridiano</h1>
      </div>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Plataforma de gestão e inteligência. Dev preview rodando com persistência in-memory — Clerk
        e Supabase entram quando as credenciais forem configuradas.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard">
          <Button>Abrir dashboard</Button>
        </Link>
        <Link href="/transactions/new">
          <Button variant="secondary">Registrar transação</Button>
        </Link>
      </div>
    </main>
  );
}
