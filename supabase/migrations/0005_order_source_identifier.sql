-- Origem do pedido deixa de ser só "whatsapp"/"manual": agora cobre os
-- canais reais de entrada (whatsapp, discord, instagram), e cada um carrega
-- um identificador que ajuda a reconhecer o cliente depois:
--   whatsapp  -> últimos 4 dígitos do telefone
--   discord   -> usuário do Discord
--   instagram -> usuário do Instagram

alter table orders drop constraint orders_source_check;
alter table orders add constraint orders_source_check
  check (source in ('whatsapp', 'discord', 'instagram', 'manual'));

alter table orders add column source_identifier text;

comment on column orders.source_identifier is
  'Últimos 4 dígitos do telefone (whatsapp) ou @usuário (discord/instagram) — ajuda a identificar o cliente sem expor o dado completo em listagens.';
