# Decisão 002 — Catálogo real do estoque: schema mais simples que o assumido

**Data:** 2026-08-22
**Status:** aceito

## Contexto

O usuário forneceu credenciais reais (`SUPABASE_URL` + `service_role`) do projeto Supabase do `mental-madness-estoque`, já alimentado com produtos reais via sync com a Shopify. Implementei e testei localmente o endpoint `GET /api/catalog/variants` (contrato 1) contra esse banco real — ver `docs/api-contracts/01-catalog-read.md` para o contrato revisado.

## O que foi confirmado com dados reais

- 18 produtos, ~101 variantes no catálogo atual.
- Schema real de `products`: `id, name, type, category, drop_id` — **sem** `sku`, `barcode`, `price`, `image_url`.
- Schema real de `variants`: `product_id, variant_key, size, color, estoque_real` — **sem** preço/SKU/imagem também.
- `type` = `"basico"` ou `"exclusivo"`, refletindo de qual loja Shopify o produto veio (`SHOPIFY_BASICO_*`/`SHOPIFY_EXCLUSIVO_*` no `.env` do estoque) — não é uma taxonomia de vestuário.
- `category` é esparso (`"calca"`, `"outro"`, `null`) — não confiável pra matching.
- Produtos `exclusivo` têm `drop_id == id` (cada exclusivo é seu próprio "drop"); `drops.status`/`closed_at` determina se ainda está ativo.
- **`estoque_real == 0` é o estado normal para o drop exclusivo atual (Hell Hounds) em todas as variantes** — confirmado em `src/calc/produce.js::calcExclusivo`: é produção sob demanda (`produzir = máx(0, não_processados − restantes)`), não um indicador de indisponibilidade.

## Impacto nas decisões já tomadas

1. **Contrato 1 (leitura de catálogo)** foi reescrito para expor só os campos reais (`id`, `name`, `type`, `category`, `drop`, `active`, `variants[].{variantKey,size,color,estoqueReal}`), removendo os campos inventados na v1.
2. **Preço**: continua sendo preenchido manualmente pelo operador no Vendas Externas (já era assim no formulário) — não há de onde sincronizar automaticamente. Sem mudança de UI necessária.
3. **Imagem de produto** (mencionada no briefing para `ProductSuggestion`): não existe fonte hoje. Fica como limitação conhecida — `ProductSuggestion` mostrará nome/tamanho/cor/drop, sem foto, até que (se algum dia for prioridade) uma coluna de imagem seja adicionada ao estoque.
4. **Contrato 2 (registro de demanda)**: a validação de item **não pode** exigir `estoqueReal > 0` como condição para aceitar o pedido em produtos exclusivos — isso bloquearia todo pedido de um drop sob demanda, contrariando o próprio modelo de negócio. A validação correta é: produto existe → variante existe → (se exclusivo) drop está ativo.
5. **`orders` (estoque) não tem coluna `quantity` hoje** — cada linha é 1 unidade. Adicionar `quantity` exige também alterar `calc/produce.js::countNaoProcessados` para somar em vez de contar linhas — documentado como parte obrigatória do mesmo PR em `docs/api-contracts/02-external-orders.md`.
6. `types/database.ts` do Vendas Externas (`CatalogProduct`/`CatalogVariant`) precisa perder os campos `sku`, `barcode`, `price`, `image_url`, `available_quantity` quando as migrations de `catalog_cache`/`catalog_variants` forem escritas (fase 4) — mantidos por ora só como tipos de referência, ainda não usados por nenhuma migration real.

## Execução

- Implementado e testado localmente em `_reference/mental-madness-estoque` (branch `feature/external-orders-api`, não commitado/pushado): `src/routes/api.js` ganhou `GET /api/catalog/variants` reaproveitando `db.load()`.
- Testado com `node --env-file=.env src/server.js` + `curl` contra o Supabase de produção real — resposta confirmada batendo com os dados reais (18 produtos, drop "Hell Hounds" ativo).
- Credenciais reais usadas só localmente em `_reference/mental-madness-estoque/.env` (gitignored no repo do estoque e excluído por completo do repo do Vendas Externas via `_reference/` no `.gitignore` raiz) — nunca commitadas.
