# Contrato 2 — Registro de demanda externa (`mental-madness-estoque`)

**Direção:** Vendas Externas → `mental-madness-estoque`
**Status:** desenhado e revisado contra o schema real; endpoint ainda **não implementado** (só o de leitura do contrato 1 foi). Branch `feature/external-orders-api`.

## ⚠️ Revisão vs. versão anterior deste documento

Lendo `src/db.js`, `src/calc/produce.js` e a tabela `orders` real (via `service_role`), o schema de pedidos é mais simples do que a v1 deste contrato assumia:

```
orders(id, shopify_order_id, product_id, size, color, status, created_at)
```

- **Não existe `variant_key` combinado** na tabela de pedidos — é `product_id` + `size` + `color` (colunas separadas), casando exatamente com a chave usada por `calcExclusivo`/`calcBasico` em `src/calc/produce.js`.
- **Cada linha representa 1 unidade.** `countNaoProcessados` conta `orders.filter(...).length` — não soma quantidade. Se adicionarmos uma coluna `quantity`, **`calc/produce.js::countNaoProcessados` precisa ser alterado para somar `o.quantity ?? 1`**, senão um pedido externo com quantidade 3 seria contado como 1 na produção. Isso é uma mudança de código necessária, não só de schema — incluir no mesmo PR.
- **`estoqueReal == 0` não bloqueia novo pedido para produtos `type: "exclusivo"`** — é produção sob demanda (ver contrato 1). A validação de variante deve checar apenas: produto existe, variante (`size`+`color`) existe nesse produto, e — se exclusivo — o drop está `ativo`/não encerrado. Nunca checar `estoqueReal > 0` como gate de criação.

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

### Payload (revisado para casar com `product_id`+`size`+`color`)

```json
{
  "source": "external",
  "sourceOrderId": "b3b8c1e2-...",
  "displayNumber": "EXT-1048",
  "confirmedAt": "2026-08-22T18:20:00Z",
  "items": [
    {
      "sourceItemId": "6af1a2b3-...",
      "productId": "shopify-10799740682552",
      "size": "M",
      "color": null,
      "quantity": 1
    }
  ]
}
```

### Semântica

1. Cada item vira `quantity` linha(s) de demanda `nao_processado` em `orders` (ou 1 linha + coluna `quantity`, mantendo `countNaoProcessados` ajustado — ver revisão acima) — mesma semântica já usada para pedidos Shopify (§13.2 do briefing).
2. Unicidade por `(source, source_order_id, source_item_id)` — reenvio do mesmo evento não duplica a linha nem altera saldo de novo.
3. Validação nesta ordem: produto existe → variante (`size`+`color`) existe nesse produto → se `type === "exclusivo"`, o drop correspondente está `ativo` e sem `closed_at`. **Não** valida `estoqueReal > 0`.

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
{ "error": "product_not_found" }
{ "error": "variant_not_found" }
{ "error": "drop_closed" }
{ "error": "invalid_quantity" }
```

## `POST /api/external-orders/:id/cancel`

Remove/reverte demanda **ainda não processada** (etiqueta ainda não gerada). Se a etiqueta já processou (baixa física já ocorreu), retorna 409 — cancelamento pós-baixa é responsabilidade do fluxo de etiquetas (ver contrato 3), não deste endpoint.

```json
{ "cancelled": true }
```

## Notas de implementação

- Escrita granular: `INSERT ... ON CONFLICT (source, source_order_id, source_item_id) DO NOTHING RETURNING ...` (ou `UPDATE` pontual equivalente) — nunca o padrão `load()/save()` legado (confirmado como arriscado em `docs/decisions/001`).
- Requer migration aditiva em `orders`: `source text default 'shopify'`, `source_order_id text`, `source_item_id text`, `quantity integer default 1`, `unique (source, source_order_id, source_item_id)`.
- **Requer também** alterar `src/calc/produce.js::countNaoProcessados` para somar `quantity` em vez de contar linhas (`orders.reduce((sum,o)=>sum+(o.quantity??1),0)` no lugar de `.filter(...).length`) — sem isso, pedidos externos com quantidade > 1 subestimam a produção necessária.
- IDs Shopify existentes (`shopify_order_id`) continuam funcionando sem alteração — este contrato só adiciona um caminho paralelo para `source='external'`.
