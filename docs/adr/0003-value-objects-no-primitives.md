# ADR 0003 — Domínio com Value Objects, não tipos primitivos

**Status:** Accepted
**Data:** 2026-05-25

## Contexto

Em sistemas fiscais/financeiros, "primitive obsession" — modelar CPF como
`string`, valor monetário como `number`, etc. — produz uma classe específica de
bug que é cara em produção:

- Multiplicar BRL por uma alíquota como `number` perde centavos por ponto
  flutuante (`0.1 + 0.2 !== 0.3`).
- Comparar um CPF formatado (`"123.456.789-09"`) com o mesmo CPF "limpo"
  (`"12345678909"`) retorna `false`.
- Passar um valor em USD onde se espera BRL não dá erro de compilação.
- Validação de checksum (CPF/CNPJ) é repetida em N pontos do código, com
  implementações ligeiramente diferentes.

Precisamos de uma convenção que mova essas invariantes para o tipo, não para a
disciplina do desenvolvedor.

## Decisão

O package `@meridiano/domain` modela conceitos críticos como **value objects**
imutáveis com construção total via `Result`:

### Princípios

1. **Imutabilidade obrigatória** — `Object.freeze` no construtor, todos os
   métodos retornam nova instância. Sem mutação acidental, thread-safe por
   construção (relevante para workers).

2. **Construção total via `Result<T, E>`** — `Money.parse`, `CPF.parse`,
   `CNPJ.parse` retornam `Result.ok(value)` ou `Result.err(error)` em vez de
   lançar exceção. Erros viram parte do tipo de retorno; chamador é obrigado
   a tratá-los. (Wrappers `*Unsafe` existem para fixtures e testes.)

3. **Construtor privado** — só fábricas estáticas. Impossível instanciar com
   estado inválido.

4. **Sem dependência externa para validação** — implementação interna do
   checksum de CPF/CNPJ, sem `brutils` ou similar. Razão: bug em lib de
   terceiros em domínio fiscal é caro e a aritmética é trivial.

### Decisões específicas por value object

**`Money`** representa um valor monetário como par `(minor: bigint, currency)`.

- `bigint` evita imprecisão IEEE-754 sem dependência externa estilo `decimal.js`.
- `multiply` aceita só **integer factor**. Multiplicação por decimal exige
  `multiplyDecimal(factor, rounding)` com modo de arredondamento explícito —
  banker's rounding (`half-even`) por default, padrão da NF-e brasileira.
- `allocate(n)` e `allocateByRatios(...)` distribuem centavos remanescentes
  sem perder nem inventar dinheiro — propriedade testada por fast-check.
- Operações entre moedas diferentes lançam `CurrencyMismatchError` em tempo de
  execução (TS não consegue ainda expressar a invariante em compile-time sem
  branding adicional; se virar pain point, introduzir `Money<C extends
CurrencyCode>`).

**`CPF`** e **`CNPJ`** armazenam só dígitos (formatação é projeção).

- `equals` compara dígitos — formatação não afeta identidade.
- `CPF.parse('000.000.000-00')` falha (repdigit) — alinhado com a Receita.
- `CNPJ.root` (8 dígitos) e `CNPJ.branch` (4 dígitos) ficam acessíveis;
  `isHeadquarters()` testa `branch === '0001'`. Pequeno luxo para análises
  por raiz societária.
- **Escopo:** apenas CNPJ **numérico**. O CNPJ alfanumérico (Receita,
  Resolução 2024, em vigor a partir de 2026) fica fora do Sprint 0 e será
  tratado em ADR própria quando entrarmos no fluxo de cadastro PJ.

### Geração para testes

- `CPF.generate(rng)` e `CNPJ.generate(rng)` aceitam um RNG injetável,
  permitindo testes determinísticos.
- **Comentário obrigatório no JSDoc:** "Generated values are for tests/fixtures
  only. Never use a generated CPF to impersonate a real individual."

### Anti-padrões proibidos

- `string` ou `number` cru para CPF, CNPJ, valor monetário ou moeda dentro
  do domínio. ESLint não detecta isso ainda; revisão de código segura.
- `JSON.parse(json)` direto: use `Money.fromJSON(...)` que volta `Result`.
- Aritmética monetária com `number` em qualquer lugar do código de domínio.

## Consequências

### Positivas

- Bugs aritméticos por imprecisão de `number` ficam impossíveis em
  `@meridiano/domain` (e em qualquer consumidor que use Money).
- Validação de CPF/CNPJ ocorre uma vez, na fronteira (parse). Resto do
  código assume válido por tipo.
- Round-trip JSON (`toJSON`/`fromJSON`) é testado por property — serialização
  para fila/HTTP/DB sem surpresas.
- Property-based tests verificam leis algébricas (associatividade, identidade,
  distributividade) — bugs sutis aparecem com input gerado, não esperam
  produção.

### Negativas

- Construção via `Result` é mais verbosa do que throw. Mitigado por
  `parseUnsafe` em pontos onde o caller já validou (fixtures, configs).
- Allocate/multiplyDecimal exigem que o caller pense em arredondamento.
  Intencional — esconder isso é como nasceram os bugs em primeiro lugar.
- Performance: `bigint` é mais lento que `number`. Irrelevante em qualquer
  caso de uso realista do Meridiano (não somamos milhões de cifras por
  segundo); benchmark se virar gargalo.

## Notas

- Próximos value objects esperados em sprints seguintes: `Email`, `Telefone`,
  `CEP`, `IE` (inscrição estadual), `InscricaoMunicipal`. Mesma convenção.
- Eventualmente avaliar **branded types** (`Money<'BRL'>` ao invés de `Money`
  com checagem runtime) — atualmente o ganho não compensa a fricção de
  generics em todo lugar.
