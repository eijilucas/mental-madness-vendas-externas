-- Frete cobrado do cliente passa a vir do payload (campo shipping_amount,
-- default 0). Antes shipping_amount ficava sempre 0 e total_amount = subtotal;
-- agora total_amount = subtotal + frete. Chamadas antigas sem o campo
-- continuam funcionando (coalesce pra 0).

create or replace function create_external_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idempotency_key text := payload->>'idempotency_key';
  v_existing_order orders%rowtype;
  v_order_id uuid;
  v_public_number bigint;
  v_status text;
  v_failure_reason text;
  v_cpf text := regexp_replace(payload->'customer'->>'cpf', '\D', '', 'g');
  v_item jsonb;
  v_item_matched boolean;
  v_all_items_matched boolean := true;
  v_subtotal numeric(12,2) := 0;
  v_shipping numeric(12,2) := coalesce((payload->>'shipping_amount')::numeric, 0);
begin
  if v_idempotency_key is null or v_idempotency_key = '' then
    raise exception 'idempotency_key é obrigatório' using errcode = '22023';
  end if;

  select * into v_existing_order from orders where idempotency_key = v_idempotency_key;
  if found then
    return jsonb_build_object(
      'status', v_existing_order.status,
      'public_number', v_existing_order.public_number,
      'order_id', v_existing_order.id,
      'failure_reason', v_existing_order.failure_reason
    );
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

  insert into orders (
    idempotency_key, status, customer_name, cpf, email, phone, source, source_identifier,
    original_message, subtotal, shipping_amount, discount_amount, total_amount,
    failure_reason, created_by, confirmed_by, confirmed_at
  ) values (
    v_idempotency_key, v_status, payload->'customer'->>'name', v_cpf,
    payload->'customer'->>'email', payload->'customer'->>'phone',
    coalesce(payload->>'source', 'whatsapp'), payload->>'source_identifier',
    coalesce(payload->>'original_message', ''),
    v_subtotal, v_shipping, 0, v_subtotal + v_shipping,
    v_failure_reason, auth.uid(),
    case when v_status = 'created' then auth.uid() else null end,
    case when v_status = 'created' then now() else null end
  )
  returning id, public_number into v_order_id, v_public_number;

  insert into order_addresses (
    order_id, cep, street, number, complement, district, city, state, ibge_code, cep_verified
  ) values (
    v_order_id,
    payload->'address'->>'cep', payload->'address'->>'street', payload->'address'->>'number',
    payload->'address'->>'complement', payload->'address'->>'district', payload->'address'->>'city',
    payload->'address'->>'state', payload->'address'->>'ibge_code',
    coalesce((payload->'address'->>'cep_verified')::boolean, false)
  );

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
      v_order_id,
      case when v_item_matched then v_item->>'catalog_product_id' else null end,
      case when v_item_matched then (v_item->>'catalog_product_id') || '::' || (v_item->>'variant_key') else null end,
      null,
      v_item->>'product_name', v_item->>'color', v_item->>'size',
      (v_item->>'quantity')::int, (v_item->>'unit_price')::numeric,
      (v_item->>'unit_price')::numeric * (v_item->>'quantity')::int
    );
  end loop;

  insert into audit_events (actor_id, entity_type, entity_id, action, metadata)
  values (auth.uid(), 'order', v_order_id, 'created', jsonb_build_object('status', v_status));

  return jsonb_build_object(
    'status', v_status,
    'public_number', v_public_number,
    'order_id', v_order_id,
    'failure_reason', v_failure_reason
  );
end;
$$;

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
  v_shipping numeric(12,2) := coalesce((payload->>'shipping_amount')::numeric, 0);
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
    shipping_amount = v_shipping,
    total_amount = v_subtotal + v_shipping,
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
