-- Grupos de pedidos — organização manual, tipicamente um grupo por drop
-- exclusivo (ex.: "Hell Hounds"), pra facilitar visualizar/navegar os
-- pedidos daquele drop juntos. Associação é manual (o operador escolhe
-- quais pedidos entram) e cada pedido pertence a no máximo um grupo — sem
-- ação em lote por enquanto, é só organização/visualização.

create table order_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger order_groups_set_updated_at
  before update on order_groups
  for each row execute function set_updated_at();

alter table orders add column group_id uuid references order_groups (id) on delete set null;
create index orders_group_id_idx on orders (group_id);

alter table order_groups enable row level security;

-- Tabela de baixo risco (só nome/metadados, nenhum dado sensível de
-- cliente) — ao contrário de orders, libera CRUD direto pra autenticado
-- em vez de exigir uma RPC dedicada.
create policy "order_groups: leitura para autenticados"
  on order_groups for select
  to authenticated
  using (true);

create policy "order_groups: criar para autenticados"
  on order_groups for insert
  to authenticated
  with check (true);

create policy "order_groups: renomear para autenticados"
  on order_groups for update
  to authenticated
  using (true)
  with check (true);

create policy "order_groups: apagar para autenticados"
  on order_groups for delete
  to authenticated
  using (true);

-- orders não tem policy de update pra authenticated de propósito (toda
-- escrita passa por RPC security definer, ver 0002) — então associar/
-- desassociar pedido de grupo também precisa de uma RPC dedicada, mesmo
-- sendo uma mudança de baixo risco.
create or replace function set_order_group(p_order_id uuid, p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update orders set group_id = p_group_id where id = p_order_id;
end;
$$;

revoke execute on function set_order_group(uuid, uuid) from public;
grant execute on function set_order_group(uuid, uuid) to authenticated;
