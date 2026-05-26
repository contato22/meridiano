# Meridiano

Plataforma de gestão e inteligência para o AWQ Group.

## Stack

TypeScript (Node 22) · pnpm workspaces · Turborepo · Vitest + fast-check ·
ESLint flat config · Prettier. Decisões registradas em [`docs/adr/`](./docs/adr/).

## Estrutura

```
meridiano/
├── packages/
│   └── domain/         # @meridiano/domain — Money, CPF, CNPJ, Result
├── docs/
│   └── adr/            # Architecture Decision Records
└── .github/workflows/  # CI
```

## Desenvolvimento

```bash
pnpm install              # instala dependências
pnpm test                 # roda todos os testes
pnpm lint                 # ESLint
pnpm typecheck            # tsc --noEmit em todos os packages
pnpm build                # tsc -b incremental
pnpm format               # Prettier write
pnpm format:check         # Prettier check (usado no CI)
```

### Por package

```bash
pnpm --filter @meridiano/domain test
pnpm --filter @meridiano/domain exec vitest --coverage
```

## Requisitos

- Node ≥22
- pnpm 10.x (`corepack enable && corepack prepare pnpm@10.33.0 --activate`)
