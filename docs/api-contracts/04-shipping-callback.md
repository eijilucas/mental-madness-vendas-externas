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
  "event": "shipping.label_generated",
  "status": "label_generated",
  "occurredAt": "2026-08-22T19:40:00Z",
  "metadata": {
    "trackingCode": null,
    "labelUrl": "https://..."
  }
}
```

### Eventos possíveis (`event`)

`shipping.pending_approval`, `shipping.approved`, `shipping.label_generated`, `shipping.tracking_available`, `shipping.held`, `shipping.failed`, `shipping.cancelled` — mesma lista do briefing §14.3.

## Semântica no receptor

1. Verifica assinatura; assinatura inválida → 401, sem processar.
2. `eventId` é chave de idempotência — se já visto (tabela `integration_attempts`), responde 200 sem reprocessar.
3. Atualiza o metadado de fulfillment do pedido (não o status de negócio simplificado exposto ao operador) e grava em `audit_events`.
4. Nunca expõe esse payload bruto na UI do operador — só no detalhe técnico acessível a admin, mascarando CPF/telefone se presentes em metadata.

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
