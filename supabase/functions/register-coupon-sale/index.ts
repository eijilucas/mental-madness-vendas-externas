// ============================================================================
// Edge Function: register-coupon-sale
//
// Chamada pelo frontend do Vendas Externas depois que um pedido é criado
// com sucesso e o operador informou um cupom de afiliado. Repassa a venda
// pro mental-madness-mvp (sistema de comissão), via
// register-external-order-sale, autenticado por secret compartilhado
// (EXTERNAL_ORDER_SALE_SECRET — nunca exposto ao navegador, fica só como
// secret desta function).
//
// Exige sessão de usuário autenticado do Vendas Externas (verify_jwt=true,
// padrão do gateway) — diferente da chamada seguinte, que usa secret.
//
// Deploy:
//   npx supabase functions deploy register-coupon-sale --project-ref yriimdzhvohlqdgigbbg
//   npx supabase secrets set EXTERNAL_ORDER_SALE_SECRET=<secret> MVP_FUNCTIONS_URL=https://tflxotunokypiakkdyxs.supabase.co --project-ref yriimdzhvohlqdgigbbg
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EXTERNAL_SECRET = Deno.env.get("EXTERNAL_ORDER_SALE_SECRET") ?? "";
const MVP_FUNCTIONS_URL = Deno.env.get("MVP_FUNCTIONS_URL") ?? "";

interface RequestBody {
  order_id?: string;
  coupon_code?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  // O gateway do Supabase já valida o JWT (verify_jwt=true, config.toml
  // default) antes do código rodar — aqui só confirmamos que é um usuário
  // de verdade, não anon.
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

  const { order_id, coupon_code } = body;
  if (!order_id || !coupon_code || !coupon_code.trim()) {
    return jsonResponse({ error: "order_id_and_coupon_code_required" }, 400);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("id, status, total_amount, coupon_sale_status")
    .eq("id", order_id)
    .maybeSingle();

  if (orderError || !order) {
    return jsonResponse({ error: "order_not_found" }, 404);
  }
  if (order.status !== "created") {
    return jsonResponse({ error: "order_not_created" }, 400);
  }
  if (order.coupon_sale_status === "registered") {
    return jsonResponse({ status: "registered", already: true });
  }

  const { data: items } = await adminClient
    .from("order_items")
    .select("product_name")
    .eq("order_id", order_id);

  const productName = (items ?? []).map((i) => i.product_name).join(", ") || null;

  let mvpResult: { ok?: boolean; error?: string } = {};
  try {
    const res = await fetch(`${MVP_FUNCTIONS_URL}/functions/v1/register-external-order-sale`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EXTERNAL_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coupon_code: coupon_code.trim(),
        gross_amount: order.total_amount,
        product_name: productName,
        external_order_id: order.id,
      }),
    });
    mvpResult = await res.json();
    if (!res.ok) mvpResult.error = mvpResult.error || "mvp_call_failed";
  } catch (err) {
    console.error("Falha ao chamar mental-madness-mvp:", err);
    mvpResult = { error: "network_error" };
  }

  let newStatus: "registered" | "not_found" | "error";
  if (mvpResult.ok) {
    newStatus = "registered";
  } else if (mvpResult.error === "coupon_not_found") {
    newStatus = "not_found";
  } else {
    newStatus = "error";
  }

  await adminClient
    .from("orders")
    .update({ coupon_code: coupon_code.trim(), coupon_sale_status: newStatus })
    .eq("id", order_id);

  await adminClient.from("audit_events").insert({
    entity_type: "order",
    entity_id: order_id,
    action: "coupon_sale_attempt",
    metadata: { coupon_code: coupon_code.trim(), result: newStatus },
  });

  return jsonResponse({ status: newStatus });
});
