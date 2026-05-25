# ADR 0001 — Stack: TypeScript + pnpm + Turborepo + Vitest + fast-check

**Status:** Accepted
**Data:** 2026-05-25

## Contexto

O Meridiano é uma plataforma de gestão e inteligência do AWQ Group com pesado
componente fiscal/financeiro brasileiro (CPF, CNPJ, NF-e, regimes tributários,
movimentação de caixa). Precisamos escolher uma stack que sustente:

1. **Modelagem de domínio rica** — value objects, agregados, invariantes
   expressas no tipo. Bugs aritméticos em domínio fiscal são caros.
2. **Property-based testing** — para checksums (CPF/CNPJ), aritmética monetária
   e regras de alocação, exemplos manuais não cobrem o espaço de estado.
3. **Compartilhamento de código** entre futuros consumidores (API HTTP, jobs
   batch, integrações com SEFAZ/ERP, frontend interno).
4. **Velocidade de iteração** num time pequeno, sem perder rigor de tipos.

Stacks consideradas:

| Stack                    | Prós                                                                                                                                   | Contras                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **TypeScript + Node 22** | Mesma linguagem front/back, tipos estruturais expressivos, ecossistema fiscal BR maduro (sped, nota fiscal libs), fast-check excelente | Aritmética monetária exige cuidado (number imprecisão → usar bigint)                                                             |
| **Python 3.12 + uv**     | Hypothesis é referência para property-based testing, ecossistema fiscal BR forte (brutils, pynfe)                                      | Tipagem opcional menos rigorosa, deploy/runtime mais pesado                                                                      |
| **Go 1.23**              | Performance, deploy simples, tipos                                                                                                     | Value objects verbosos (sem genéricos plenos para esse padrão), property-based testing menos maduro, ecossistema fiscal BR menor |

## Decisão

Adotamos **TypeScript** como linguagem primária com o seguinte conjunto:

- **Runtime:** Node.js ≥22 LTS (estável, suporta nativo de `bigint`,
  `Intl.NumberFormat` com `pt-BR`)
- **Gerenciador de pacotes:** pnpm 10 (workspaces nativos, store deduplicado,
  drasticamente mais rápido que npm/yarn em monorepos)
- **Orquestrador de build:** Turborepo 2 (cache local + remoto opcional,
  inferência de grafo de dependência entre packages)
- **Test runner:** Vitest 2 (compatível com Vite/esbuild, hot reload de testes,
  cobertura via v8)
- **Property-based testing:** fast-check 3 (API funcional, shrinking inteligente,
  estável em produção em fintechs brasileiras)
- **Linting:** ESLint 9 (flat config) com `typescript-eslint` (regras
  `recommendedTypeChecked` + `stylisticTypeChecked`)
- **Formatação:** Prettier 3

Configuração TypeScript em modo **estrito máximo**:
`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`,
`exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`. Acesso
indexado retorna `T | undefined` por padrão — bugs de boundary ficam impossíveis
de ignorar.

## Consequências

### Positivas

- Time consegue mover sem trocar de contexto entre linguagens — front interno
  futuro reaproveita a camada `@meridiano/domain`.
- `bigint` resolve precisão monetária sem dependência externa estilo `decimal.js`.
- Property-based testing fica como cidadão de primeira classe desde Sprint 0.
- Configuração TS estrita previne classes inteiras de bug em domínio fiscal
  (acesso a campos undefined, narrowing incorreto de uniões, etc.).

### Negativas

- Aritmética monetária com `number` é uma armadilha latente para quem não
  conhece a convenção — mitigado por desabilitar/banir `multiply(decimal)` sem
  rounding explícito (ver ADR-0003) e por property tests que verificam
  associatividade/comutatividade.
- ESM-only com `NodeNext` força extensões `.js` em imports — atrito pequeno
  para quem vem de CommonJS; benefício: pacotes do workspace exportáveis para
  consumidores ESM modernos sem dual-package hazard.
- Build incremental do TS exige `composite: true` nas refs do workspace, com a
  complicação adicional de tsbuildinfo. Aceitável; Turborepo cacheia o trabalho.

## Notas

- Versões mínimas no `engines`: Node ≥22. CI fixa essa versão.
- `packageManager` no `package.json` raiz fixa pnpm 10.33.0 para garantir
  reprodutibilidade entre dev/CI.
