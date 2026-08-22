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

## Pendências

- `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` (a **anon key**, não a service_role) ainda precisam ser configuradas no `.env.local` do frontend quando o app sair do modo demo (`VITE_MOCK_AUTH`) — a anon key real desse projeto ainda não foi coletada nesta sessão.
- Nenhum usuário (`auth.users`/`profiles`) foi criado ainda — login real segue indisponível até isso ser feito.
- Edge Functions (`orders-api`, `dispatch-integrations`, `integration-callback`) ainda não foram implantadas.
