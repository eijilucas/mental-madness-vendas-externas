# Contrato 6 — Exclusão de pedido externo (linka criar/editar/apagar)

**Direção:** Vendas Externas → `mm-etiquetas` e `mental-madness-mvp`
**Status:** implementado (2026-09-05). Motivado por um bug real: apagar um pedido no Vendas Externas não removia o pedido da fila do mm-etiquetas nem revertia a venda por cupom no mental-madness-mvp — as duas outras pontas ficavam com dado órfão pra sempre.

## Contexto

A criação de um pedido já dispara dois efeitos colaterais (best-effort, não bloqueiam a criação em si):
- `send-to-shipping` → `external-order-intake` no mm-etiquetas (contrato 3).
- `register-coupon-sale` → `register-external-order-sale` no mental-madness-mvp (contrato 5).

Apagar e editar um pedido precisam do mesmo tratamento simétrico — se não, os três sistemas divergem silenciosamente.

## Apagar (`delete-order`, Vendas Externas)

```
POST /functions/v1/delete-order
Authorization: Bearer <JWT do usuário logado>
{ "order_id": "<uuid do pedido>" }
```

Orquestra, nesta ordem, todas best-effort (uma falha aqui não impede o pedido de ser apagado — ele já não existe mais do lado de cá, que é o que importa primeiro; falha vira log + `audit_events` pra reprocessamento manual futuro):

1. Se `shipping_status = 'sent'`: `DELETE` em `external-order-intake` (mm-etiquetas).
2. Se `coupon_sale_status = 'registered'`: `DELETE` em `register-external-order-sale` (mental-madness-mvp).
3. `delete_order` (RPC, já existente) — apaga o pedido de verdade no Vendas Externas.

### `DELETE external-order-intake` (mm-etiquetas)

```
DELETE /functions/v1/external-order-intake
Authorization: Bearer <EXTERNAL_ORDERS_SECRET>
{ "externalOrderId": "<uuid do pedido no Vendas Externas>", "reason": "Pedido excluído no Vendas Externas" }
```

Busca `orders_shipping` por `store_key='external' AND shopify_order_id=externalOrderId`:
- Não encontrado → `{ ok: true, found: false }` (idempotente — pedido que nunca chegou a entrar na fila, ex.: falhou como `not_created`).
- Já `archived` → `{ ok: true, found: true, finalStatus: "archived", already: true }`.
- `pending_approval`/`held` → arquiva direto (sem passar pelas travas de status do `/archive` do painel humano, que não se aplicam a essa sincronização automática).
- Em processamento (`approved`..`failed`) → `cancelOrderLabel` (cancela na Melhor Envio se já comprado, reporta reversão de estoque) e então arquiva.

### `DELETE register-external-order-sale` (mental-madness-mvp)

```
DELETE /functions/v1/register-external-order-sale
Authorization: Bearer <EXTERNAL_ORDER_SALE_SECRET>
{ "external_order_id": "<uuid do pedido no Vendas Externas>" }
```

Busca `sales` por `external_order_id`: não encontrado → `{ ok: true, deleted: false }` (idempotente); encontrado → apaga `sale_items` e `sales` → `{ ok: true, deleted: true }`.

## Editar

`update_external_order` (RPC) continua só atualizando o pedido localmente. A ponte pro mm-etiquetas/mvp acontece no **frontend** (`EditOrderPage`), espelhando exatamente o que `NewOrderPage` já faz após criar:

- Se o pedido passou a `status='created'` e `shipping_status` ainda não é `'sent'` → chama `send-to-shipping` (primeira vez que esse pedido específico é despachado — cobre o caso comum de corrigir um pedido `not_created` e reenviar).
- Se tem cupom preenchido e `coupon_sale_status` ainda não é `'registered'` → chama `register-coupon-sale`.

**Fora de escopo por ora**: re-sincronizar um pedido que **já foi despachado** (`shipping_status='sent'`) e teve itens/endereço alterados depois — isso exigiria um endpoint de **atualização em lugar** no mm-etiquetas (o pipeline de etiqueta pode já estar em qualquer estágio: carrinho criado, etiqueta comprada etc., e cada um precisaria de uma regra própria de "o que fazer com a mudança"). Documentado aqui como pendência conhecida, não implementado nesta rodada.

## Notas de implementação

- Nenhum secret novo — reaproveita `EXTERNAL_ORDERS_SECRET`/`ETIQUETAS_FUNCTIONS_URL` (já configurados pra `send-to-shipping`) e `EXTERNAL_ORDER_SALE_SECRET`/`MVP_FUNCTIONS_URL` (já configurados pra `register-coupon-sale`).
- `delete-order` grava um `audit_events` com o resultado de cada chamada (`mm_etiquetas` e `commission`: `"synced"` | `"not_linked"` | `"error"`) — histórico pra saber se alguma ponta ficou órfã sem precisar investigar logs de Edge Function.
