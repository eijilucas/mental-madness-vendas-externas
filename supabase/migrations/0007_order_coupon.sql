-- Cupom de afiliado usado no pedido (opcional, qualquer origem — não só
-- WhatsApp). Quando preenchido, o pedido tenta registrar a venda no
-- mental-madness-mvp (sistema de comissão) via Edge Function
-- register-coupon-sale, que chama register-external-order-sale de lá.
-- coupon_sale_status guarda o resultado pro operador ver no detalhe do
-- pedido, sem expor jargão técnico de integração.

alter table orders add column coupon_code text;
alter table orders add column coupon_sale_status text
  check (coupon_sale_status in ('none', 'registered', 'not_found', 'error'))
  default 'none';
