-- Mental Madness — Vendas Externas
-- Schema inicial. Convenções:
--   * RLS habilitada e default-deny em toda tabela — acesso real acontece
--     via Edge Functions com service_role, nunca direto do navegador.
--   * "orders.status" só tem dois valores visíveis ao operador (criado /
--     não criado), conforme §10 do briefing — estado técnico fino
--     (outbox, tentativas) fica em integration_outbox/integration_attempts,
--     nunca exposto como "status do pedido".
--   * catalog_products/catalog_variants espelham exclusivamente
--     mental-madness-estoque (ver docs/api-contracts/01-catalog-read.md) —
--     sem preço/sku/imagem, porque essas colunas não existem lá.

create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'operator', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy "profiles: usuário lê o próprio perfil"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- catalog_products / catalog_variants (espelho do mental-madness-estoque)
-- ---------------------------------------------------------------------
create table catalog_products (
  id text primary key, -- mesmo id do estoque (ex.: "shopify-10799740682552")
  name text not null,
  type text not null check (type in ('basico', 'exclusivo')),
  category text,
  drop_id text,
  drop_name text,
  drop_status text,
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger catalog_products_set_updated_at
  before update on catalog_products
  for each row execute function set_updated_at();

create table catalog_variants (
  product_id text not null references catalog_products (id) on delete cascade,
  variant_key text not null,
  size text,
  color text,
  estoque_real integer not null default 0,
  synced_at timestamptz not null default now(),
  primary key (product_id, variant_key)
);

create index catalog_variants_product_id_idx on catalog_variants (product_id);

alter table catalog_products enable row level security;
alter table catalog_variants enable row level security;

create policy "catalog_products: leitura para autenticados"
  on catalog_products for select
  to authenticated
  using (true);

create policy "catalog_variants: leitura para autenticados"
  on catalog_variants for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- product_aliases
-- ---------------------------------------------------------------------
create table product_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  product_id text not null references catalog_products (id) on delete cascade,
  variant_key text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (alias, product_id)
);

alter table product_aliases enable row level security;

create policy "product_aliases: leitura para autenticados"
  on product_aliases for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- orders / order_addresses / order_items
-- ---------------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  public_number bigint generated always as identity,
  status text not null check (status in ('created', 'not_created')),
  customer_name text not null,
  cpf text not null,
  email text,
  phone text not null,
  source text not null default 'whatsapp' check (source in ('whatsapp', 'manual')),
  original_message text not null default '',
  subtotal numeric(12, 2) not null default 0,
  shipping_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  failure_reason text,
  created_by uuid not null references profiles (id),
  confirmed_by uuid references profiles (id),
  confirmed_at timestamptz,
  cancelled_by uuid references profiles (id),
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

create index orders_status_created_at_idx on orders (status, created_at desc);
create index orders_created_by_created_at_idx on orders (created_by, created_at desc);
create unique index orders_public_number_idx on orders (public_number);

create table order_addresses (
  order_id uuid primary key references orders (id) on delete cascade,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  district text not null,
  city text not null,
  state char(2) not null,
  ibge_code text,
  cep_verified boolean not null default false
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  catalog_product_id text references catalog_products (id),
  catalog_variant_id text, -- "product_id::variant_key", snapshot — não é FK viva
  sku text,
  product_name text not null,
  color text,
  size text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_price numeric(12, 2) not null
);

create index order_items_order_id_idx on order_items (order_id);

alter table orders enable row level security;
alter table order_addresses enable row level security;
alter table order_items enable row level security;
-- Sem policies de select/insert pra authenticated de propósito: toda
-- leitura/escrita de pedido passa pela Edge Function `orders-api`
-- (service_role), que aplica mascaramento de CPF/telefone conforme o
-- papel do usuário antes de devolver ao cliente.

-- ---------------------------------------------------------------------
-- integration_outbox / integration_attempts
-- ---------------------------------------------------------------------
create table integration_outbox (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders (id) on delete cascade,
  destination text not null check (destination in ('inventory', 'shipping')),
  event_type text not null,
  idempotency_key text not null unique,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'retry_wait', 'failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index integration_outbox_pending_idx
  on integration_outbox (status, next_attempt_at)
  where status in ('pending', 'retry_wait');

create table integration_attempts (
  id bigint generated always as identity primary key,
  outbox_id bigint not null references integration_outbox (id) on delete cascade,
  attempted_at timestamptz not null default now(),
  duration_ms integer,
  http_status integer,
  result text not null,
  message text
);

create index integration_attempts_outbox_id_idx on integration_attempts (outbox_id);

alter table integration_outbox enable row level security;
alter table integration_attempts enable row level security;
-- Sem policies: só a Edge Function dispatch-integrations (service_role)
-- mexe aqui. A Central de Integrações lê através de uma Edge Function
-- própria que mascara CPF/telefone do payload antes de devolver.

-- ---------------------------------------------------------------------
-- audit_events
-- ---------------------------------------------------------------------
create table audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles (id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_entity_idx on audit_events (entity_type, entity_id, created_at desc);

alter table audit_events enable row level security;
