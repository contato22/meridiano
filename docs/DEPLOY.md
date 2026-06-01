# Deploy do Meridiano

Guia para publicar o Meridiano na Vercel. Estado atual: persistência
in-memory, gate de acesso por HTTP Basic Auth. Clerk + Supabase entram
quando você fornecer as credenciais (ver `.env.example`).

---

## 1. Conectar o repo na Vercel

1. Acesse <https://vercel.com/new>
2. Selecione **Import Git Repository → `contato22/meridiano`**
3. **Root Directory:** deixe `./` (raiz do monorepo). O `vercel.json` na
   raiz já direciona o build para `apps/web`.
4. **Framework Preset:** Next.js (detectado automaticamente)
5. **Build & Output:** deixe os defaults — `vercel.json` sobrescreve
   o que importa.

## 2. Configurar variáveis de ambiente

Em **Project Settings → Environment Variables**, adicione:

| Variável              | Valor                                                  | Ambientes            |
| --------------------- | ------------------------------------------------------ | -------------------- |
| `ACCESS_USER`         | (escolha um login, ex.: `awq`)                         | Production + Preview |
| `ACCESS_PASSWORD`     | (gere com `openssl rand -base64 24`)                   | Production + Preview |
| `NEXT_PUBLIC_APP_URL` | `https://<seu-projeto>.vercel.app` (ou domínio custom) | Production           |

> **Não deixe `ACCESS_*` em branco em produção.** Se omitir, o gate fica
> desligado e qualquer um na internet consegue ler o ledger.

As demais variáveis (`DATABASE_URL`, `CLERK_*`, etc.) só são necessárias
quando PR-B for completado com Clerk + Drizzle wirados. Por enquanto a
app roda 100% com dados em memória.

## 3. Disparar o deploy

Push para `main` (ou clique **Deploy** na Vercel) dispara o build. Você
recebe um link `https://<seu-projeto>.vercel.app` ao final.

## 4. Domínio custom (opcional)

1. **Project Settings → Domains → Add** `meridiano.awq.com.br`
2. No painel DNS do `awq.com.br` (Registro.br ou onde estiver), crie um
   `CNAME meridiano → cname.vercel-dns.com.`
3. Vercel emite o certificado automaticamente. Atualize
   `NEXT_PUBLIC_APP_URL` para o domínio definitivo.

## 5. Smoke test

Logado com o usuário/senha que você cadastrou:

1. Abrir `https://<dominio>/` → landing
2. Abrir `https://<dominio>/dashboard` → resumo do AWQ Group
3. Abrir `https://<dominio>/transactions/new` → preencher Débito Despesas
   R$ 5.000 / Crédito Caixa R$ 5.000 → **Registrar**
4. Abrir `https://<dominio>/ledger` → ver a transação
5. Abrir `https://<dominio>/accounts` → ver Caixa = -R$ 5.000

> **Importante:** os dados são in-memory por instância serverless. Cada
> redeploy / cold start zera o ledger. Persistência real entra no PR-B
> (Drizzle + Supabase) — o código de UI já está pronto para receber esse
> swap sem mudanças.

## 6. Limitações conscientes deste preview

- **Dados não persistem.** Reinicialização da função → ledger zerado.
- **Não tem login de verdade.** Basic Auth é uma trava temporária.
- **Sem multi-tenant.** Toda visita compartilha o mesmo singleton.
- **Sem RLS, sem audit log.** Vem com PR-B + PR-D.

Se for compartilhar com Danilo / família agora, use o Basic Auth e troque
a senha periodicamente. Quando Clerk + Supabase estiverem ligados, este
gate é removido (uma linha no `middleware.ts`) e o Clerk passa a mediar
todo `/(dashboard)/*`.
