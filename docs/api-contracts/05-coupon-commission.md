# Contrato 5 — Registro de venda por cupom (`mental-madness-mvp`)

**Direção:** Vendas Externas → `mental-madness-mvp` (sistema de comissionamento por cupom, projeto Supabase `tflxotunokypiakkdyxs`)
**Status:** implementado, publicado e testado contra produção real em 2026-08-22.

## Contexto

`mental-madness-mvp` é o painel de comissionamento de afiliados: cada membro tem um cupom Shopify, e vendas com esse cupom contam pro ciclo mensal dele (peças + comissão %). Quando um pedido do Vendas Externas usa um cupom de afiliado, precisa contar pra esse ciclo também — mesma regra de negócio de uma venda Shopify normal, só que a origem é diferente.

## Fluxo (dois saltos, dois secrets diferentes)

```
Navegador (usuário logado no Vendas Externas)
  → register-coupon-sale (Edge Function, Vendas Externas, verify_jwt=true)
    → register-external-order-sale (Edge Function, mental-madness-mvp, secret compartilhado)
```

O secret (`EXTERNAL_ORDER_SALE_SECRET`) nunca chega ao navegador — fica configurado como Supabase Secret nos dois projetos, e a chamada entre eles acontece servidor-a-servidor.

## `register-coupon-sale` (Vendas Externas)

```
POST /functions/v1/register-coupon-sale
Authorization: Bearer <JWT do usuário logado>
{ "order_id": "<uuid do pedido>", "coupon_code": "DARK" }
```

- Só aceita pedidos com `status = 'created'`.
- Idempotente: se `orders.coupon_sale_status` já é `'registered'` pra esse pedido, retorna sem tentar de novo.
- Busca os nomes dos itens do pedido pra mandar como `product_name` (só exibição no outro sistema).
- Atualiza `orders.coupon_code` e `orders.coupon_sale_status` (`registered` | `not_found` | `error`) com o resultado.

## `register-external-order-sale` (mental-madness-mvp)

```
POST /functions/v1/register-external-order-sale
Authorization: Bearer <EXTERNAL_ORDER_SALE_SECRET>
{
  "coupon_code": "DARK",
  "gross_amount": 289.90,
  "product_name": "Calça Oversized - Hell Hounds Drop",
  "external_order_id": "<uuid do pedido no Vendas Externas>"
}
```

- Busca o membro pelo cupom (case-insensitive, mesma lógica do `shopify-webhook` de lá).
- `coupon_not_found` (404) se não achar; `coupon_inactive` (400) se o membro estiver desativado.
- Idempotente por `external_order_id` (coluna nova, unique quando não nula) — reenvio do mesmo pedido não duplica a venda nem conta duas vezes na comissão.
- Insere em `sales` com `source = 'manual'` (mesmo valor usado pra venda manual via WhatsApp lançada pelo admin — o afiliado não diferencia a origem, só o valor conta).

## Regras de negócio confirmadas com o usuário (2026-08-22)

- Cupom é **opcional** e vale pra **qualquer canal** de origem do pedido (WhatsApp, Discord, Instagram) — não é exclusivo de um canal.
- Cupom não encontrado **não bloqueia a criação do pedido** — o pedido já foi criado antes dessa chamada acontecer. Só aparece um aviso pro operador: "Cupom não encontrado — confira se está digitado corretamente ou contate o TI." Correção manual (se precisar) acontece direto no painel admin do `mental-madness-mvp`.
- Venda é registrada **no momento da criação do pedido**, não numa etapa posterior (confirmação de pagamento, despacho etc.).
- **Atualização (2026-09-05):** a reversão em caso de pedido cancelado deixou de ser manual — apagar o pedido no Vendas Externas agora chama automaticamente `DELETE /functions/v1/register-external-order-sale`, que remove a venda e seus itens (contrato: [06-external-order-delete.md](06-external-order-delete.md)). Só sobra correção manual no painel admin do MVP para casos fora desse fluxo (ex.: cupom errado sem apagar o pedido).
- Valor lançado é o **`total_amount` do pedido inteiro**, não por item — um pedido com várias peças conta como **um único uso do cupom**, igual uma venda Shopify normal com o cupom aplicado no carrinho inteiro.

## Notas de implementação

- Publicado via Supabase CLI com Personal Access Token — primeira Edge Function real do projeto (as etapas anteriores usavam uma função Postgres/RPC por falta desse token).
- Testado contra produção real: cupom válido (`DARK`), idempotência, cupom inexistente, secret errado, case-insensitive — todos os casos de teste foram removidos das tabelas reais depois (não afetam a comissão real de ninguém).
