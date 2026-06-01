# @meridiano/web

Next.js 15 app (App Router, React 19, Tailwind CSS 4).

Sprint 1 scope: skeleton only. Auth (Clerk), DB (Drizzle + Supabase), tRPC, and
real UI are wired in PR-B and PR-C.

## Local dev

```bash
pnpm install                       # from repo root
pnpm --filter @meridiano/web dev   # http://localhost:3000
```

## Required env vars

Until PR-B lands, only `NEXT_PUBLIC_APP_URL` is referenced (and it has a default).
Future vars will be added to `lib/env.ts`.

## Structure

```
apps/web/
├── app/
│   ├── (auth)/          # /sign-in, /sign-up — Clerk components in PR-B
│   ├── (dashboard)/     # /dashboard, /accounts, /ledger, /transactions/new
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Landing
│   └── globals.css      # Tailwind v4 + theme
├── components/
│   └── ui/              # Local UI primitives (shadcn-style)
├── lib/
│   └── env.ts           # Typed env access
└── next.config.ts
```
