-- Código de rastreio do pedido, preenchido pelo callback assinado que o
-- mm-etiquetas manda (integration-callback) quando o rastreio de um pedido
-- externo é liberado (status "tracking_synced" em orders_shipping). Também
-- guarda quando o e-mail de aviso foi mandado pro cliente, pra não
-- reenviar duas vezes se o callback chegar repetido (idempotência por
-- estado, além do eventId em integration_attempts).

alter table orders add column tracking_code text;
alter table orders add column tracking_notified_at timestamptz;

-- Idempotência do lado que RECEBE o callback (integration-callback) —
-- diferente de integration_outbox/integration_attempts, que existem pra
-- rastrear o que ESTE sistema manda pra fora (nunca chegou a ser usado,
-- send-to-shipping/register-coupon-sale chamam direto). Um evento
-- (eventId) já processado não deve reprocessar em caso de retry do lado
-- do mm-etiquetas.
create table integration_callback_events (
  event_id text primary key,
  order_id uuid references orders (id) on delete set null,
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table integration_callback_events enable row level security;
-- Sem policies: só a Edge Function integration-callback (service_role) mexe aqui.
