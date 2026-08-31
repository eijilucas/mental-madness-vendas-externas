-- Espelha coupon_sale_status (0007), mas pro envio pro mm-etiquetas
-- (send-to-shipping) — todo pedido criado tenta entrar na fila de
-- aprovação de envio, então o default aqui é 'pending' (tentativa ainda
-- não terminou/nunca rodou), não 'none' como no cupom (que é opcional).
-- Alimenta a Central de Integrações com dado real em vez de mockado.

alter table orders add column shipping_status text
  check (shipping_status in ('pending', 'sent', 'failed'))
  default 'pending';

alter table orders add column shipping_last_error text;
