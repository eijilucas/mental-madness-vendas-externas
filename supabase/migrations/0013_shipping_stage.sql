-- Espelha o estágio real do pedido no pipeline de etiquetas do
-- mm-etiquetas (orders_shipping.status + posted_at), alimentado pelo novo
-- evento shipping.status_changed/shipping.posted do callback assinado (ver
-- docs/api-contracts/04-shipping-callback.md). Antes disso a Vendas
-- Externas só sabia se o pedido tinha sido ACEITO pelo mm-etiquetas
-- (shipping_status: pending/sent/failed) — nada sobre o que acontece
-- depois. Alimenta as abas Fila de aprovação/Liberados/Rastreio/Postados
-- da tela de Pedidos.
--
-- Null até o primeiro callback chegar (pedido ainda em pending_approval no
-- mm-etiquetas, que não dispara evento — ver nota no contrato). Os valores
-- possíveis são o enum shipping_status bruto de lá, não um vocabulário
-- próprio daqui — repetir o enum evita uma tradução que não agrega nada e
-- fica sempre um passo atrás se o mm-etiquetas ganhar um status novo.
alter table orders add column shipping_stage text
  check (shipping_stage in (
    'approved', 'cart_created', 'purchased', 'label_generated',
    'tracking_ready', 'tracking_synced', 'held', 'failed', 'archived'
  ));

alter table orders add column shipping_posted_at timestamptz;
