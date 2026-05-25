# Meridiano

Plataforma de gestão e inteligência para o AWQ Group.

## Stack

TypeScript (Node 22) · pnpm workspaces · Turborepo · Next.js 15 · React 19 ·
Tailwind CSS 4 · Vitest + fast-check · ESLint flat config · Prettier.
Decisões registradas em [`docs/adr/`](./docs/adr/).

## Estrutura

```
meridiano/
├── apps/
│   └── web/             # @meridiano/web — Next.js 15 (App Router, RSC)
├── packages/
│   ├── domain/          # @meridiano/domain — Money<C>, CPF, CNPJ, Ledger, Result
│   └── application/     # @meridiano/application — use cases + ports (hex arch)
├── docs/
│   └── adr/             # Architecture Decision Records
└── .github/workflows/   # CI
```

## Desenvolvimento

```bash
pnpm install                              # instala dependências
pnpm test                                 # roda todos os testes
pnpm lint                                 # ESLint
pnpm typecheck                            # tsc --noEmit em todos os packages
pnpm build                                # tsc -b incremental + Next build
pnpm format                               # Prettier write
pnpm format:check                         # Prettier check (usado no CI)
pnpm --filter @meridiano/web dev          # Next dev server (http://localhost:3000)
```

### Por package

```bash
pnpm --filter @meridiano/domain test
pnpm --filter @meridiano/domain exec vitest --coverage
pnpm --filter @meridiano/application test
```

## Requisitos

- Node ≥22
- pnpm 10.x (`corepack enable && corepack prepare pnpm@10.33.0 --activate`)
