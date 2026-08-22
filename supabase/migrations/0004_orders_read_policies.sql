-- A migration 0001 deixou orders/order_addresses/order_items sem NENHUMA
-- policy de propósito ("acesso só via Edge Function com service_role").
-- Só que a leitura do painel ainda não passa por Edge Function — hoje o
-- frontend lê essas tabelas direto via client autenticado (TanStack Query).
-- Sem policy de select, RLS default-deny bloqueia até o próprio usuário que
-- criou o pedido de vê-lo depois.
--
-- Liberado para leitura de qualquer usuário autenticado por enquanto — não
-- diferencia admin/operator/viewer ainda (isso fica para quando existir de
-- fato controle de papel + mascaramento de CPF/telefone via Edge Function ou
-- view, conforme §17 do briefing). Registrar como simplificação temporária.

create policy "orders: leitura para autenticados"
  on orders for select
  to authenticated
  using (true);

create policy "order_addresses: leitura para autenticados"
  on order_addresses for select
  to authenticated
  using (true);

create policy "order_items: leitura para autenticados"
  on order_items for select
  to authenticated
  using (true);
