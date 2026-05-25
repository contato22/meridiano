# ADR 0002 — Layout do monorepo

**Status:** Accepted
**Data:** 2026-05-25

## Contexto

A escolha de monorepo (ADR-0001) precisa de uma topologia clara. Sem disciplina
de fronteiras, monorepos colapsam em "ball of mud" — qualquer arquivo importa
qualquer arquivo, e o grafo de dependências vira espaguete.

Precisamos de uma estrutura que:

1. Separe **domínio puro** (sem I/O) de **adapters** (HTTP, DB, integrações).
2. Permita **múltiplos apps** consumirem o mesmo domínio (API REST, jobs,
   CLI fiscal, eventualmente frontend interno).
3. Force fronteiras detectáveis pelo build/lint, não apenas por convenção.

## Decisão

Layout em duas raízes principais:

```
meridiano/
├── packages/           # Bibliotecas reutilizáveis. Sem efeitos colaterais no import.
│   └── domain/         # Sprint 0: Money, CPF, CNPJ, Result
│                       # Próximos sprints esperados: identity, billing, fiscal
└── apps/               # Entradas executáveis. Compõem packages, fazem I/O.
                        # (Vazio em Sprint 0 — virá em Sprint 1)
```

### Regras de dependência

1. **`packages/*` NÃO depende de `apps/*`**, ponto. Apps compõem packages, nunca
   o inverso.
2. **`packages/domain` é folha** — não depende de nenhum outro package interno.
   É o núcleo puro: sem fetch, sem fs, sem DB, sem clock global. Determinismo
   total para testes.
3. **Cada package publica via `exports` map** com subpaths (`@meridiano/domain`,
   `@meridiano/domain/money`, etc.). Imports profundos (`@meridiano/domain/src/...`)
   são proibidos — quebram o contrato e o build incremental.
4. **Nomes scoped** sob `@meridiano/*`. Reservado para uso interno; nada é
   publicado em registry público sem decisão explícita.

### Convenções de build

- Cada package tem `tsconfig.json` (estende `tsconfig.base.json` da raiz) e
  `tsconfig.build.json` (com `composite: true`, `rootDir: src`, exclui tests).
- `tsc -b tsconfig.build.json` faz build incremental respeitando `references`.
- `vitest` lê `tsconfig.json` (que inclui tests) para checagem de tipos durante
  desenvolvimento; o build emit ignora tests.
- ESLint usa `projectService: true` (TS-ESLint v8) para resolver o tsconfig
  automaticamente por arquivo.

### Workspace tooling

- **pnpm workspace** (`pnpm-workspace.yaml`) resolve `@meridiano/*` localmente.
- **Turborepo** orquestra `build`, `test`, `lint`, `typecheck` com `dependsOn`
  em `^build` — garante que upstream esteja construído antes do consumidor.

## Consequências

### Positivas

- Camada de domínio testável sem mocks de I/O — property tests rodam em
  milissegundos.
- Adicionar um novo app (`apps/cli-fiscal`, `apps/jobs-conciliacao`) não
  perturba o domínio: composição, não acoplamento.
- Build incremental: editar `packages/domain/src/money` só re-builda o que
  depende.
- Quebras de fronteira aparecem como erro de import (TS) e de lint, não em
  code review.

### Negativas

- Boilerplate por package (3-4 arquivos JSON de config). Mitigado por
  templates implícitos (próximos packages copiam de `packages/domain`).
- `exports` map com subpaths exige manutenção quando um package ganha um novo
  módulo público. Custo baixo; benefício alto (encapsulamento real).
- Devs vindos de monorepo sem fronteiras (Nx style "any-to-any") podem estranhar
  a recusa do TS em resolver `@meridiano/domain/src/...`. Documentado aqui.

## Notas

- Quando um novo app for adicionado, deve viver em `apps/<nome>` com seu próprio
  `package.json`, e listar dependências internas via `"@meridiano/domain":
"workspace:*"`.
- Quando um novo package for adicionado, deve seguir o mesmo padrão de
  `tsconfig.json` + `tsconfig.build.json` + `exports` map de `packages/domain`.
