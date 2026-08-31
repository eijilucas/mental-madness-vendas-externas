-- Editar e excluir pedido — mesma validação de create_external_order
-- (CPF, casamento de item com o catálogo), mas atualizando em vez de
-- inserir. Itens são substituídos por completo (delete + insert) em vez
-- de tentar casar item a item, mais simples e evita estado inconsistente
-- se a lista de itens mudar de tamanho na edição.

create or replace function update_external_order(p_order_id uuid, payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_public_number bigint;
  v_status text;
  v_failure_reason text;
  v_cpf text := regexp_replace(payload->'customer'->>'cpf', '\D', '', 'g');
  v_item jsonb;
  v_item_matched boolean;
  v_all_items_matched boolean := true;
  v_subtotal numeric(12,2) := 0;
  v_was_created boolean;
begin
  select status = 'created' into v_was_created from orders where id = p_order_id;
  if not found then
    raise exception 'Pedido não encontrado' using errcode = '22023';
  end if;

  if not is_valid_cpf(v_cpf) then
    v_status := 'not_created';
    v_failure_reason := 'CPF inválido.';
  end if;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    if not exists (
      select 1 from catalog_variants
      where product_id = v_item->>'catalog_product_id'
        and variant_key = v_item->>'variant_key'
    ) then
      v_all_items_matched := false;
    end if;
    v_subtotal := v_subtotal + (v_item->>'unit_price')::numeric * (v_item->>'quantity')::int;
  end loop;

  if v_status is null and not v_all_items_matched then
    v_status := 'not_created';
    v_failure_reason := 'Produto não encontrado no catálogo.';
  end if;

  if v_status is null then
    v_status := 'created';
  end if;

  update orders set
    status = v_status,
    customer_name = payload->'customer'->>'name',
    cpf = v_cpf,
    email = payload->'customer'->>'email',
    phone = payload->'customer'->>'phone',
    source = coalesce(payload->>'source', source),
    source_identifier = coalesce(payload->>'source_identifier', source_identifier),
    original_message = coalesce(payload->>'original_message', original_message),
    subtotal = v_subtotal,
    total_amount = v_subtotal,
    failure_reason = v_failure_reason,
    confirmed_by = case
      when v_status = 'created' and not coalesce(v_was_created, false) then auth.uid()
      else confirmed_by
    end,
    confirmed_at = case
      when v_status = 'created' and not coalesce(v_was_created, false) then now()
      else confirmed_at
    end
  where id = p_order_id
  returning public_number into v_public_number;

  update order_addresses set
    cep = payload->'address'->>'cep',
    street = payload->'address'->>'street',
    number = payload->'address'->>'number',
    complement = payload->'address'->>'complement',
    district = payload->'address'->>'district',
    city = payload->'address'->>'city',
    state = payload->'address'->>'state',
    ibge_code = payload->'address'->>'ibge_code',
    cep_verified = coalesce((payload->'address'->>'cep_verified')::boolean, false)
  where order_id = p_order_id;

  delete from order_items where order_id = p_order_id;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_item_matched := exists (
      select 1 from catalog_variants
      where product_id = v_item->>'catalog_product_id'
        and variant_key = v_item->>'variant_key'
    );

    insert into order_items (
      order_id, catalog_product_id, catalog_variant_id, sku, product_name, color, size,
      quantity, unit_price, total_price
    ) values (
      p_order_id,
      case when v_item_matched then v_item->>'catalog_product_id' else null end,
      case when v_item_matched then (v_item->>'catalog_product_id') || '::' || (v_item->>'variant_key') else null end,
      null,
      v_item->>'product_name', v_item->>'color', v_item->>'size',
      (v_item->>'quantity')::int, (v_item->>'unit_price')::numeric,
      (v_item->>'unit_price')::numeric * (v_item->>'quantity')::int
    );
  end loop;

  insert into audit_events (actor_id, entity_type, entity_id, action, metadata)
  values (auth.uid(), 'order', p_order_id, 'updated', jsonb_build_object('status', v_status));

  return jsonb_build_object(
    'status', v_status,
    'public_number', v_public_number,
    'order_id', p_order_id,
    'failure_reason', v_failure_reason
  );
end;
$$;

revoke execute on function update_external_order(uuid, jsonb) from public;
grant execute on function update_external_order(uuid, jsonb) to authenticated;

-- Exclusão — cascata já remove order_addresses/order_items/integration_outbox
-- (FKs on delete cascade, ver 0001). Registra o evento antes de apagar,
-- já que depois não existe mais order_id pra referenciar de forma útil.
create or replace function delete_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id;
  if not found then
    return;
  end if;

  insert into audit_events (actor_id, entity_type, entity_id, action, metadata)
  values (
    auth.uid(), 'order', p_order_id, 'deleted',
    jsonb_build_object('public_number', v_order.public_number, 'customer_name', v_order.customer_name)
  );

  delete from orders where id = p_order_id;
end;
$$;

revoke execute on function delete_order(uuid) from public;
grant execute on function delete_order(uuid) to authenticated;
