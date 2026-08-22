# Decisão 001 — Divergências entre o briefing e o código real

**Data:** 2026-08-22
**Status:** aceito

## Contexto

O briefing pediu para inspecionar `mental-madness-estoque` e `mm-etiquetas` antes de desenhar qualquer contrato. A inspeção (repos clonados localmente, leitura direta do código) encontrou divergências relevantes em relação ao que os dois documentos de briefing assumiam. Este documento registra o que foi encontrado e a decisão tomada em cada ponto.

## Divergências encontradas

### 1. Caminhos de arquivo do briefing 2 apontam para o repo errado

O briefing cita `src/mmEtiquetas.js`, `src/routes/api.js`, `src/db.js`, `src/shopify/mapping.js` como parte de `mm-etiquetas`. Na realidade esses arquivos pertencem a **`mental-madness-estoque`**. O `mm-etiquetas` real (produção) vive inteiramente em `supabase/functions/*` (Deno) — o equivalente Express desses arquivos existe apenas em `mm-etiquetas/legacy-node-express/`, que o próprio README do repo marca como arquivado e sem manutenção.

**Decisão:** todo o trabalho em `mm-etiquetas` mira `supabase/functions/*`, nunca `legacy-node-express/`.

### 2. `mental-madness-estoque` não tem migrations versionadas

Não existe `supabase/migrations` nem qualquer `.sql` no repo. O schema (`drops`, `products`, `variants`, `orders`) só existe implicitamente em `src/db.js`.

**Decisão:** antes de qualquer migration aditiva, criar uma migration "baseline" que documenta o schema implícito atual, para que o histórico de migrations passe a refletir a realidade do banco.

### 3. `mental-madness-estoque` usa um padrão de escrita não-atômico e sem lock

Todo endpoint que muda estoque/pedido faz `load()` (GET de todas as tabelas) → muta um objeto JS em memória → `save()` (upsert + `reconcileDeletes` de tudo). Não há transação, optimistic lock, nem `UPDATE ... WHERE`. Isso confirma o risco de concorrência citado no briefing (§13.4).

**Decisão:** os dois novos endpoints (`/api/catalog/variants`, `/api/external-orders`) são implementados com SQL/RPC pontual, isolados do padrão `load()/save()` legado. Não vamos reescrever o pipeline de sync existente — fora de escopo e risco desnecessário para este projeto.

### 4. Não existe conceito de `source`/pedido externo em nenhum dos dois repos

`mental-madness-estoque`: pedidos são só Shopify (`shopify_order_id`). `mm-etiquetas`: distingue lojas por `store_key`, não por origem; `orders_shipping.shopify_order_id` é `NOT NULL` no schema.

**Decisão:** ambos os repos precisam de migration aditiva introduzindo `source` (e colunas correlatas) antes que o novo sistema possa registrar demanda/etiqueta. Ver contratos 2 e 3.

### 5. README do `mm-etiquetas` está desatualizado quanto à autenticação do painel

Descreve um `INTERNAL_API_TOKEN` bearer compartilhado; o código real (`_shared/auth.ts`, `config.toml` com `verify_jwt=true` em `orders-api`) usa Supabase Auth JWT de usuário logado.

**Decisão:** nenhuma ação corretiva nesse repo além de não replicar esse padrão desatualizado; a nova função `external-order-intake` segue o padrão real usado por `shopify-webhook`/`reconciliation-cron` (`verify_jwt=false` + secret bearer próprio), não o README.

### 6. Callback estoque↔etiquetas é fire-and-forget, sem outbox nem retry

`mm-etiquetas/_shared/estoque.ts` despacha e engole falhas deliberadamente (comentário explícito no código: é considerado "secondary concern"). Há um gap documentado no próprio código: um cancelamento pós-`tracking_synced` pode ser revertido silenciosamente pela reconciliação periódica.

**Decisão:** o novo callback `mm-etiquetas → integration-callback` (Vendas Externas) **não** replica esse padrão — é assinado (HMAC) e persiste em `integration_attempts` do lado do Vendas Externas, com retry lá. Não alteramos o comportamento best-effort existente entre `mm-etiquetas` e `mental-madness-estoque`, que é escopo de outro projeto.

## Decisões de arquitetura (confirmadas com o usuário)

- **Catálogo/estoque**: fonte única é `mental-madness-estoque` (via nova rota de leitura). Vendas Externas nunca fala com a Shopify Admin API diretamente — não cria Custom App própria.
- **Escopo**: as três partes (Vendas Externas + extensões em `mental-madness-estoque` + extensões em `mm-etiquetas`) são implementadas nesta entrega, em branches locais nos clones de `_reference/`. Nenhum push/PR sem aprovação explícita por repositório.
- **Ambiente**: greenfield — sem projeto Supabase/Vercel criado ainda.
- **Parser assistido por IA**: fora do MVP (autorizado pelo próprio briefing, §3.3/§9.4).
