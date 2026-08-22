# Contrato 3 — Intake de etiqueta externa (`mm-etiquetas`)

**Direção:** Vendas Externas → `mm-etiquetas`
**Status:** novo, a implementar em `mm-etiquetas` (branch `feature/external-order-source`) como Edge Function própria `external-order-intake` (não reutiliza `orders-api`, que exige JWT de usuário logado).

## Endpoint

```
POST /functions/v1/external-order-intake
```

`verify_jwt = false` no `config.toml` (mesmo padrão de `shopify-webhook` e `reconciliation-cron`) — autenticação própria via secret bearer, não pelo gateway do Supabase.

## Autenticação

```
Authorization: Bearer <EXTERNAL_ORDERS_SECRET>
Idempotency-Key: external-order:<order-id>:v1
```

Mesmo valor de secret usado no contrato 2 (`EXTERNAL_ORDERS_SECRET`) — um único segredo compartilhado entre Vendas Externas e os dois sistemas para autenticar como origem confiável.

## Payload

```json
{
  "source": "external",
  "sourceOrderId": "b3b8c1e2-...",
  "displayNumber": "EXT-1048",
  "customer": {
    "name": "Luiz Felipe Gomes de Sousa",
    "email": "acardin31@gmail.com",
    "phone": "5516996169828",
    "document": "44047241873"
  },
  "shippingAddress": {
    "postalCode": "14169310",
    "street": "Rua Humberto Ortolan",
    "number": "2766",
    "complement": null,
    "district": "Jardim Montreal",
    "city": "Sertãozinho",
    "state": "SP",
    "country": "BR"
  },
  "items": [
    {
      "sourceItemId": "6af1a2b3-...",
      "title": "Calça Hell Hounds",
      "variantTitle": "M / Preto",
      "sku": "CAL-HH-M-PT",
      "quantity": 1,
      "unitPrice": "289.90",
      "inventoryProductId": "prod_123",
      "inventoryVariantKey": "M::Preto"
    }
  ],
  "totalPrice": "289.90",
  "currency": "BRL",
  "callbackUrl": "https://<projeto>.supabase.co/functions/v1/integration-callback"
}
```

## Semântica

1. Cria linha em `orders_shipping` com `source='external'`, `external_order_id=sourceOrderId`, `status='pending_approval'` — **preserva a aprovação manual existente**, não pula etapa.
2. Reaproveita o pipeline existente (`_shared/pipeline.ts`) a partir de `approved`: carrinho, compra e geração de etiqueta via Melhor Envio, sem alteração.
3. **Nunca cria `Fulfillment` no Shopify** quando `source='external'` — guarda adicionada em `syncTrackingStep`/`createFulfillment`.
4. Idempotente por `(source, external_order_id)` — reenvio do mesmo pedido não duplica linha; segue a mesma lógica de `upsertPendingCandidate` (read-then-conditional-write) já usada para `store_key + shopify_order_id`.

## Resposta 201

```json
{ "accepted": true, "status": "pending_approval" }
```

## Resposta 409 (idempotência)

Mesma chave, payload diferente:

```json
{ "error": "idempotency_conflict" }
```

## Erros de domínio (400)

```json
{ "error": "invalid_address" }
{ "error": "missing_document" }
```

## Notas de implementação

- Requer migration aditiva em `orders_shipping`: `source text default 'shopify'`, `external_order_id text`, `external_item_id text`, constraint de unicidade separada para `source='external'` (ex.: `unique (source, external_order_id) where source = 'external'`), já que `shopify_order_id` continua `not null` só para linhas `source='shopify'` (relaxar o `NOT NULL` ou usar `CHECK` condicional).
- CPF e bairro são obrigatórios neste payload — sem eles, o pedido não pode seguir para o Melhor Envio (mesma regra do briefing §26).
- Ver contrato 4 para o callback de volta ao Vendas Externas.
