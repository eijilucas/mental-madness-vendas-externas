alter table orders add column idempotency_key text;
create unique index orders_idempotency_key_idx on orders (idempotency_key) where idempotency_key is not null;

-- Criação idempotente de pedido, exposta como RPC (`POST /rest/v1/rpc/create_external_order`)
-- pro frontend chamar diretamente enquanto as Edge Functions não são publicadas
-- (precisam de um token de management que ainda não temos — ver docs/decisions/003).
--
-- security definer: roda com privilégio do dono da função (bypassa RLS das
-- tabelas de pedido), mas o único caminho de entrada é este validador — não
-- é um INSERT livre. auth.uid() dentro da função ainda reflete o usuário
-- chamador (PostgREST propaga o JWT independente de security definer).

create or replace function is_valid_cpf(cpf_input text)
returns boolean
language plpgsql
immutable
as $$
declare
  cpf text := regexp_replace(cpf_input, '\D', '', 'g');
  digits int[];
  sum1 int := 0;
  sum2 int := 0;
  d1 int;
  d2 int;
  i int;
begin
  if length(cpf) != 11 then
    return false;
  end if;
  if cpf ~ '^(\d)\1{10}$' then
    return false;
  end if;

  for i in 1..11 loop
    digits[i] := substr(cpf, i, 1)::int;
  end loop;

  for i in 1..9 loop
    sum1 := sum1 + digits[i] * (11 - i);
  end loop;
  d1 := (sum1 * 10) % 11;
  if d1 = 10 then d1 := 0; end if;

  for i in 1..10 loop
    sum2 := sum2 + digits[i] * (12 - i);
  end loop;
  d2 := (sum2 * 10) % 11;
  if d2 = 10 then d2 := 0; end if;

  return digits[10] = d1 and digits[11] = d2;
end;
$$;

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
  v_all_items_matched boolean := true;
  v_subtotal numeric(12,2) := 0;
begin
  if v_idempotency_key is null or v_idempotency_key = '' then
    raise exception 'idempotency_key é obrigatório' using errcode = '22023';
  end if;

  -- Idempotência: mesma chave já processada retorna o resultado anterior,
  -- sem inserir de novo.
  select * into v_existing_order from orders where idempotency_key = v_idempotency_key;
  if found then
    return jsonb_build_object(
      'status', v_existing_order.status,
      'public_number', v_existing_order.public_number,
      'order_id', v_existing_order.id,
      'failure_reason', v_existing_order.failure_reason
    );
  end if;

  -- Validação: CPF.
  if not is_valid_cpf(v_cpf) then
    v_status := 'not_created';
    v_failure_reason := 'CPF inválido.';
  end if;

  -- Validação: cada item precisa casar com uma variante real do catálogo
  -- (produção sob demanda — não checa estoque_real > 0, ver docs/decisions/002).
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
    idempotency_key, status, customer_name, cpf, email, phone, source,
    original_message, subtotal, shipping_amount, discount_amount, total_amount,
    failure_reason, created_by, confirmed_by, confirmed_at
  ) values (
    v_idempotency_key, v_status, payload->'customer'->>'name', v_cpf,
    payload->'customer'->>'email', payload->'customer'->>'phone',
    coalesce(payload->>'source', 'whatsapp'), coalesce(payload->>'original_message', ''),
    v_subtotal, 0, 0, v_subtotal,
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
    insert into order_items (
      order_id, catalog_product_id, catalog_variant_id, sku, product_name, color, size,
      quantity, unit_price, total_price
    ) values (
      v_order_id,
      nullif(v_item->>'catalog_product_id', ''),
      case when v_item->>'catalog_product_id' is not null
        then (v_item->>'catalog_product_id') || '::' || (v_item->>'variant_key')
        else null end,
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

revoke execute on function create_external_order(jsonb) from public;
grant execute on function create_external_order(jsonb) to authenticated;
