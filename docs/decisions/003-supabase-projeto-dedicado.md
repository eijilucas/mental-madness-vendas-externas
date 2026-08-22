# Decisão 003 — Projeto Supabase dedicado (não compartilhado com o estoque)

**Data:** 2026-08-22
**Status:** aceito e aplicado

## Contexto

A conta Supabase do usuário já tinha 2 projetos ativos (limite do plano free por organização). Isso gerou uma discussão sobre três caminhos:

1. Compartilhar o mesmo projeto/banco do `mental-madness-estoque` (schema novo isolado, mesmo Postgres) — risco: login (Supabase Auth) compartilhado entre os dois painéis, e qualquer erro de RLS/migration roda no mesmo banco de produção do estoque.
2. Pausar/deletar um dos 2 projetos existentes pra abrir espaço.
3. Nova conta Supabase (e-mail diferente) — projeto 100% isolado, sem custo.

## Decisão

O usuário optou por uma **nova conta/projeto**, totalmente separado do estoque. Projeto:

- Ref: `yriimdzhvohlqdgigbbg`
- Região: `sa-east-1` (São Paulo) — descoberta por tentativa, já que o painel não deixou claro e o usuário teve dificuldade de achar a connection string exata.
- URL: `https://yriimdzhvohlqdgigbbg.supabase.co`

Zero risco de contaminação com o estoque — bancos Postgres completamente diferentes, sem nada em comum.

## Execução

- `supabase/migrations/0001_init.sql` aplicado com sucesso em 2026-08-22 contra o projeto real, via conexão direta ao Postgres (pooler `aws-0-sa-east-1.pooler.supabase.com:6543`, modo transaction — a conexão direta em `db.<ref>.supabase.co:5432` só tem registro DNS AAAA/IPv6 e não é alcançável a partir deste ambiente).
- 10 tabelas confirmadas criadas: `profiles`, `orders`, `order_addresses`, `order_items`, `catalog_products`, `catalog_variants`, `product_aliases`, `integration_outbox`, `integration_attempts`, `audit_events`.
- RLS confirmada habilitada (`rowsecurity = true`) nas 10 tabelas via consulta direta a `pg_tables`.
- Senha do banco e a connection string usada **não foram commitadas em nenhum arquivo do repositório** — usadas só localmente numa pasta de scratch (fora do projeto), removida depois de aplicar a migration.

## Atualização — login real funcionando (mesmo dia)

- `.env.local` configurado com a anon key real do projeto; `VITE_MOCK_AUTH=false`.
- Primeiro usuário admin criado via Supabase Auth Admin API (`lucas@hinfros.com.br`, senha temporária gerada e entregue fora deste repositório) + linha correspondente em `profiles` (`role: admin`).
- Login testado no navegador contra o Supabase real: sessão criada, perfil carregado da tabela `profiles` real ("Lucas" aparece na sidebar), sessão persiste entre reloads (Supabase Auth cuida disso via localStorage — o hack de `sessionStorage` do modo mock não é mais necessário quando `VITE_MOCK_AUTH=false`).

## Pendências

- Edge Functions (`orders-api`, sincronização de catálogo, `dispatch-integrations`, `integration-callback`) ainda não foram implantadas — hoje o app ainda lê `MOCK_ORDERS`/`CATALOG_SNAPSHOT` locais, não as tabelas reais `orders`/`catalog_products`.
- Trocar a senha temporária do admin no primeiro login real (fluxo de troca de senha ainda não existe na UI — usar o painel do Supabase ou implementar isso).
- Sincronizar `catalog_products`/`catalog_variants` reais (hoje vazias) a partir do `GET /api/catalog/variants` do estoque.
