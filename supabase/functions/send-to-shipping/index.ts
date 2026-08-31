// ============================================================================
// Edge Function: send-to-shipping
//
// Chamada pelo frontend depois que um pedido é criado com sucesso — manda
// pro mm-etiquetas (external-order-intake) entrar na mesma fila de
// aprovação manual dos pedidos Shopify normais, como store_key "external".
// Autenticada por secret compartilhado (EXTERNAL_ORDERS_SECRET), nunca
// exposto ao navegador — mesmo padrão de register-coupon-sale.
//
// Best-effort do ponto de vista do pedido: se essa chamada falhar, o pedido
// já foi criado normalmente (não desfaz nada) — só fica sem entrar na fila
// de envio automaticamente, e alguém precisa mandar reprocessar depois.
//
// Deploy:
//   npx supabase functions deploy send-to-shipping --project-ref yriimdzhvohlqdgigbbg
//   npx supabase secrets set EXTERNAL_ORDERS_SECRET=<secret> ETIQUETAS_FUNCTIONS_URL=https://sqwuceasvpavaoojkzxw.supabase.co --project-ref yriimdzhvohlqdgigbbg
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EXTERNAL_ORDERS_SECRET = Deno.env.get("EXTERNAL_ORDERS_SECRET") ?? "";
const ETIQUETAS_FUNCTIONS_URL = Deno.env.get("ETIQUETAS_FUNCTIONS_URL") ?? "";

interface RequestBody {
  order_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const { order_id } = body;
  if (!order_id) {
    return jsonResponse({ error: "order_id_required" }, 400);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("id, public_number, status, customer_name, email, phone, cpf, total_amount")
    .eq("id", order_id)
    .maybeSingle();

  if (orderError || !order) {
    return jsonResponse({ error: "order_not_found" }, 404);
  }
  if (order.status !== "created") {
    return jsonResponse({ error: "order_not_created" }, 400);
  }

  const [{ data: address, error: addressError }, { data: items, error: itemsError }] = await Promise.all([
    adminClient
      .from("order_addresses")
      .select("street, number, complement, district, city, state, cep")
      .eq("order_id", order_id)
      .maybeSingle(),
    adminClient
      .from("order_items")
      .select("id, product_name, catalog_product_id, size, color, quantity, unit_price")
      .eq("order_id", order_id),
  ]);

  if (addressError || !address) {
    return jsonResponse({ error: "address_not_found" }, 404);
  }
  if (itemsError) {
    return jsonResponse({ error: "items_query_failed" }, 500);
  }

  const payload = {
    externalOrderId: order.id,
    publicNumber: order.public_number,
    customerName: order.customer_name,
    customerEmail: order.email,
    customerDocument: order.cpf,
    customerPhone: order.phone,
    totalPrice: String(order.total_amount),
    address: {
      street: address.street,
      number: address.number,
      complement: address.complement,
      district: address.district,
      city: address.city,
      state: address.state,
      cep: address.cep,
    },
    items: (items ?? []).map((item) => ({
      itemId: item.id,
      title: item.product_name,
      productId: item.catalog_product_id,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice: String(item.unit_price),
    })),
  };

  try {
    const res = await fetch(`${ETIQUETAS_FUNCTIONS_URL}/functions/v1/external-order-intake`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EXTERNAL_ORDERS_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Falha ao chamar mm-etiquetas:", result);
      return jsonResponse({ error: "etiquetas_call_failed", detail: result }, 502);
    }
    return jsonResponse({ ok: true, ...result });
  } catch (err) {
    console.error("Falha ao chamar mm-etiquetas:", err);
    return jsonResponse({ error: "network_error" }, 502);
  }
});
