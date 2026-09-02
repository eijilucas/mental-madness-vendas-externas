# Contrato 4 — Callback de status de etiqueta

**Direção:** `mm-etiquetas` → Vendas Externas
**Status:** novo. Lado emissor em `mm-etiquetas` (branch `feature/external-order-source`); lado receptor (`integration-callback`) é uma Edge Function do próprio Vendas Externas.

## Endpoint (no Vendas Externas)

```
POST /functions/v1/integration-callback
```

## Autenticação

Assinatura HMAC-SHA256 no corpo bruto, no mesmo espírito do `X-Shopify-Hmac-Sha256` já usado por `mm-etiquetas/supabase/functions/shopify-webhook`:

```
X-Signature: <hmac-sha256-hex>
```

Secret: `INTEGRATION_CALLBACK_SECRET`, compartilhado entre os dois sistemas, comparação em tempo constante.

## Payload

```json
{
  "eventId": "evt_9f2a...",
  "sourceOrderId": "b3b8c1e2-...",
  "event": "shipping.tracking_synced",
  "status": "tracking_synced",
  "occurredAt": "2026-08-22T19:40:00Z",
  "metadata": {
    "trackingCode": "BR123456789"
  }
}
```

### Eventos possíveis (`event`)

Dois eventos, na prática mais simples que a lista original prevista (`shipping.pending_approval`/`approved`/`label_generated`/... por transição): descobrimos, ao implementar, que o Vendas Externas só precisa saber em qual das 4 abas (Fila de aprovação / Liberados / Rastreio / Postados) cada pedido está — não precisa do detalhe fino de cada sub-etapa do `mm-etiquetas` (`approved` → `cart_created` → `purchased` → `label_generated`).

- **`shipping.status_changed`** — disparado sempre que `orders_shipping.status` de um pedido `store_key = "external"` muda (fim de `runShippingPipeline`, `/hold`, `/revert`). `status` carrega o valor bruto do enum `shipping_status` do `mm-etiquetas` (`pending_approval`, `approved`, `cart_created`, `purchased`, `label_generated`, `tracking_ready`, `tracking_synced`, `held`, `failed`, `archived`). `metadata.postedAt` carrega o `posted_at` atual (pode já vir preenchido se o pedido tiver sido postado antes da última mudança de status).
- **`shipping.posted`** — disparado pela rota `/post` (marca `posted_at`), sem mudar `status`. `metadata.postedAt` sempre presente.
- **`shipping.tracking_synced`** — já existente (rastreio liberado pro cliente, dispara o e-mail). Continua igual.

## Semântica no receptor

1. Verifica assinatura; assinatura inválida → 401, sem processar.
2. `eventId` é chave de idempotência — se já visto (tabela `integration_callback_events`), responde 200 sem reprocessar.
3. `shipping.status_changed`/`shipping.posted` gravam `orders.shipping_stage` (o `status` bruto do `mm-etiquetas`) e `orders.shipping_posted_at` — usados só para montar as abas da tela de Pedidos; nunca expostos como "status do pedido" pro cliente.
4. `shipping.tracking_synced` mantém o comportamento já implementado (grava `tracking_code`, dispara e-mail via Resend).

## Resposta 200

```json
{ "received": true }
```

## Erros

| Código | Motivo |
|---|---|
| 401 | assinatura ausente/inválida |
| 400 | payload não passa no schema Zod |

## Notas de implementação

- No lado `mm-etiquetas`, o disparo do callback é **best-effort com retry** (diferente do callback fire-and-forget que já existe entre `mm-etiquetas` e `mental-madness-estoque`, que não mexemos) — usa a mesma lógica de `_shared/retry.ts` (backoff exponencial + jitter) já existente no repo, reaproveitada para esta nova chamada de saída.
- Falha permanente no callback não deve travar o pipeline de etiqueta em si — é reportada como evento `integration_attempts` com status `failed` no Vendas Externas para reprocessamento manual futuro (ex.: reconsulta de status via rota autenticada, fora do escopo deste contrato).
