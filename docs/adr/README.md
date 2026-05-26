# Architecture Decision Records (ADRs)

Decisões arquiteturais relevantes do Meridiano. Cada ADR descreve **contexto**,
**decisão** e **consequências** — em vez de tentar reconstruir a intenção depois
através de arqueologia de commits.

## Formato

Seguimos o formato leve de Michael Nygard:

- **Status**: Proposed | Accepted | Deprecated | Superseded by ADR-NNNN
- **Context**: Por que estamos decidindo isso agora
- **Decision**: O que foi decidido
- **Consequences**: O que muda — positivo e negativo

## Índice

| #                                             | Título                                          | Status   |
| --------------------------------------------- | ----------------------------------------------- | -------- |
| [0001](./0001-stack-typescript-pnpm-turbo.md) | Stack: TypeScript + pnpm + Turborepo            | Accepted |
| [0002](./0002-monorepo-layout.md)             | Layout do monorepo                              | Accepted |
| [0003](./0003-value-objects-no-primitives.md) | Domínio com Value Objects, não tipos primitivos | Accepted |

## Criando uma nova ADR

1. Copie a próxima numeração sequencial (ex.: `0004-titulo-curto.md`)
2. Marque status como `Proposed` enquanto estiver em discussão; quando o PR for
   merged, mude para `Accepted`
3. ADRs anteriores **não são editadas** quando superadas — crie uma nova ADR e
   marque a anterior como `Superseded by ADR-NNNN`
