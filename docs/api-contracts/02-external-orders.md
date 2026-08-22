# Contrato 2 — Registro de demanda externa (`mental-madness-estoque`)

**Direção:** Vendas Externas → `mental-madness-estoque`
**Status:** novo, a implementar em `mental-madness-estoque` (branch `feature/external-orders-api`)

## Endpoints

```
POST /api/external-orders
POST /api/external-orders/:id/cancel
```

## Autenticação

```
Authorization: Bearer <EXTERNAL_ORDERS_SECRET>
Idempotency-Key: external-order:<order-id>:v1
Content-Type: application/json
```

## `POST /api/external-orders`

### Payload

```json
{
  "source": "external",
  "sourceOrderId": "b3b8c1e2-...",
  "displayNumber": "EXT-1048",
  "confirmedAt": "2026-08-22T18:20:00Z",
  "items": [
    {
      "sourceItemId": "6af1a2b3-...",
      "productId": "prod_123",
      "variantKey": "M::Preto",
      "quantity": 1
    }
  ]
}
```

### Semântica

1. Cada item vira uma linha de demanda `nao_processado`, participando do cálculo de produção — mesma semântica já usada para pedidos Shopify (§13.2 do briefing).
2. Unicidade por `(source, source_order_id, source_item_id)` — reenvio do mesmo evento não duplica a linha nem altera saldo de novo.
3. Validação de variante/produto acontece aqui: se `productId`+`variantKey` não existir ou estiver inativo, o endpoint rejeita (não cria pedido "pendurado").

### Resposta 201

```json
{ "accepted": true, "items": [{ "sourceItemId": "6af1a2b3-...", "status": "accepted" }] }
```

### Resposta 409 (conflito de idempotência)

Mesma `Idempotency-Key`, payload diferente do que já foi processado:

```json
{ "error": "idempotency_conflict" }
```

Mesma `Idempotency-Key`, mesmo payload: retorna o resultado anterior (200/201), sem reprocessar.

### Erros de domínio (400)

```json
{ "error": "variant_not_found" }
{ "error": "variant_inactive" }
{ "error": "invalid_quantity" }
```

## `POST /api/external-orders/:id/cancel`

Remove/reverte demanda **ainda não processada** (etiqueta ainda não gerada). Se a etiqueta já processou (baixa física já ocorreu), retorna 409 — cancelamento pós-baixa é responsabilidade do fluxo de etiquetas (ver contrato 3), não deste endpoint.

```json
{ "cancelled": true }
```

## Notas de implementação

- Escrita granular: `INSERT ... ON CONFLICT (source, source_order_id, source_item_id) DO NOTHING RETURNING ...` (ou `UPDATE` pontual equivalente) — nunca o padrão `load()/save()` legado.
- Requer a migration aditiva: `orders.source text default 'shopify'`, `orders.source_order_id text`, `orders.source_item_id text`, `orders.quantity integer default 1`, `unique (source, source_order_id, source_item_id)`.
- Os IDs Shopify existentes (`shopify_order_id`, `shopify_line_item_id` embutidos no formato `shopify-order-{id}-item-{lineItemId}`) continuam funcionando sem alteração — este contrato só adiciona um caminho paralelo para `source='external'`.
