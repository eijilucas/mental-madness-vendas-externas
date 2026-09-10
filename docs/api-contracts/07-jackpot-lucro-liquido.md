# Contrato 7 — Vincular vendas ao Jackpot (lucro líquido)

**Direção:** Vendas Externas → `mental-lucro-liquido` (projeto Supabase `vatoeojxpejefxqslgli`, "Mental | Jackpot")
**Status:** em implementação (2026-09-10).

## Contexto

O Jackpot calcula o lucro líquido de cada venda (faturamento → custo direto →
custos da venda → marketing rateado → fixos rateados). Ele preenche
`sale_revenue` **só a partir de webhooks da Shopify** (`orders/paid`,
`orders/cancelled`, `refunds/create`). Pedido do Vendas Externas nunca passa
pelo checkout da Shopify, então hoje é invisível pra DRE — o Vitor quer o
lucro líquido de **todas** as vendas.

Os itens do Vendas Externas já casam com produtos do catálogo com id
`shopify-<n>` (ex.: `shopify-10809359171896`), então a parte numérica serve
de `shopify_product_id` pra bater custo em `product_costs` e herdar a linha
`basico`/`exclusivo` automaticamente.

### Regra de negócio

Pedido do grupo **"Pedidos dos Membros"** não conta como faturamento — são
peças enviadas pro time, não venda. Esses pedidos **não são enviados** pro
Jackpot (match pelo nome do grupo no código do sync, sem mudança de schema
nos grupos).

## Quando dispara

- **Criação** (`status = 'created'`): junto com `send-to-shipping` /
  `register-coupon-sale`, no `NewOrderPage`.
- **Edição**: no `EditOrderPage`, re-sincroniza a lista de itens inteira.
- **Exclusão**: `delete-order` faz uma chamada `DELETE` best-effort a mais,
  ao lado das de mm-etiquetas e mvp.
- **Backfill**: função descartável roda uma vez sobre os pedidos
  `status='created'` que já existem (fora do grupo dos membros).

Resultado gravado em `orders.jackpot_sale_status`
(`none` | `registered` | `skipped_members` | `error`), mostrado no detalhe do
pedido igual `coupon_sale_status`.

## Mudanças no schema do Jackpot (migração nova)

### `sale_revenue`

- `+ source text not null default 'shopify' check (source in ('shopify','external'))`
- `shopify_order_id` / `shopify_line_item_id` deixam de ser `not null`
- `+ external_order_id uuid`, `+ external_item_id uuid`
- PK composta vira surrogate `id uuid default gen_random_uuid()`
- Índices únicos parciais:
  - `(shopify_order_id, shopify_line_item_id) where source = 'shopify'`
  - `(external_order_id, external_item_id) where source = 'external'`
- `shopify_product_id` inalterado — linha externa preenche com a parte
  numérica de `catalog_product_id`, ou `null` se o item não casou
- Linha externa sempre `payment_method = 'pix'` (premissa: venda WhatsApp)

### `sale_fee_rates`

- `check (id = 1)` → `check (id in (1,2))`
- Linha `id = 2` (externo): `taxa_shopify_pct = 0`,
  `taxa_gateway_cartao_pct = 0`, `taxa_gateway_pix_pct = 0.0100`,
  `taxa_gateway_pix_fixo = 1.00`, `imposto_pct = 0.0600`,
  `comissao_influencer_pct = 0.0500`, `desconto_medio_pct = 0`

### Views (`sale_overhead_allocation`, `sale_margin`, subquery `ot`)

- Chave de venda unificada:
  `coalesce(shopify_order_id::text, external_order_id::text)`
- Chave de item unificada:
  `coalesce(shopify_line_item_id::text, external_item_id::text)`
- `sale_margin`: `cross join sale_fee_rates fr where fr.id = 1` vira
  `join sale_fee_rates fr on fr.id = case when sr.source='external' then 2 else 1 end`
- Comissão de influencer só entra pra externo quando teve cupom:
  `... * case when sr.source='external' and not sr.has_coupon then 0 else 1 end`
- `monthly_totals` / `monthly_dre` não mudam

`has_coupon` da linha externa = `coupon_sale_status = 'registered'` no
Vendas Externas (comissão realmente registrada), não só cupom digitado.

## `register-external-sale` (Edge Function no Jackpot)

Auth: bearer `EXTERNAL_SALE_SECRET`. `verify_jwt = false`. Estilo do
`shopify-webhook` de lá (service_role, sem `Deps`).

### `POST`

```
{
  "externalOrderId": "<uuid>",
  "saleDate": "<timestamptz>",
  "hasCoupon": false,
  "items": [
    {
      "externalItemId": "<uuid>",
      "shopifyProductId": 10809359171896,   // ou null
      "productName": "Camiseta X - Preto",
      "productLine": "basico",              // ou "exclusivo" ou null
      "quantity": 1,
      "grossAmount": 129.90
    }
  ]
}
```

- `upsert` em `sale_revenue` (`source='external'`, `payment_method='pix'`),
  conflito no índice parcial externo.
- Substitui a lista inteira: apaga linhas `source='external'` daquele
  `external_order_id` que não vieram no payload (item removido na edição),
  depois faz upsert do resto.
- `shopifyProductId` não-nulo sem linha em `product_costs` → cria stub
  (custo zerado, `product_line` recebido), reusando `EXCLUDED_NAME_PATTERNS`
  (gift card / pingente não ganham stub; a receita entra do mesmo jeito).
- Resposta: `{ ok: true, rows: <n> }`.

### `DELETE`

```
{ "externalOrderId": "<uuid>" }
```

Apaga todas as linhas `source='external'` do pedido. Idempotente. Resposta:
`{ ok: true, deleted: <n> }`.

## `register-jackpot-sale` (Edge Function no Vendas Externas)

Auth: sessão de usuário (`verify_jwt = true`), igual `register-coupon-sale`.

`POST { order_id }`:

1. Busca `orders` (`id, status, created_at, coupon_sale_status, group_id`),
   `order_items` e o nome do grupo (`order_groups.name`).
2. Se `status !== 'created'` → `{ status: 'skipped' }` sem chamar o Jackpot.
3. Se nome do grupo === `"Pedidos dos Membros"` → grava
   `jackpot_sale_status = 'skipped_members'`, responde `{ status: 'skipped_members' }`.
4. Monta o payload (parte numérica de `catalog_product_id` → `shopifyProductId`;
   `type` do catálogo → `productLine`), `POST` no `register-external-sale` do
   Jackpot com `EXTERNAL_SALE_SECRET` / `JACKPOT_FUNCTIONS_URL`.
5. Grava `jackpot_sale_status` = `registered` | `error`, insere `audit_events`.

`delete-order` ganha uma chamada `DELETE` best-effort ao
`register-external-sale` quando `jackpot_sale_status` foi `registered`
(mesma forma das chamadas a mm-etiquetas e mvp).

### Secrets (Vendas Externas)

- `EXTERNAL_SALE_SECRET` — compartilhado com o Jackpot
- `JACKPOT_FUNCTIONS_URL` = `https://vatoeojxpejefxqslgli.supabase.co`

### Secrets (Jackpot)

- `EXTERNAL_SALE_SECRET` — mesmo valor

## Migração no Vendas Externas

`0014_order_jackpot_status.sql`:

```sql
alter table orders add column jackpot_sale_status text not null default 'none'
  check (jackpot_sale_status in ('none', 'registered', 'skipped_members', 'error'));
```

## Fora de escopo

- Reembolso / cancelamento parcial de pedido externo (o Vendas Externas só
  tem apagar o pedido inteiro).
- Método de pagamento real por pedido externo — assumido pix.
- Tela no Jackpot pra ver as vendas externas separadas (a DRE já soma tudo;
  filtro por origem fica pra depois se o Vitor pedir).
