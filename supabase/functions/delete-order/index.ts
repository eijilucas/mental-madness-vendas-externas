// ============================================================================
// Edge Function: delete-order
//
// Chamada pelo frontend em vez de rodar a RPC delete_order direto — apagar
// um pedido aqui não desfazia o efeito colateral que a criação já tinha
// disparado (send-to-shipping/register-coupon-sale), deixando o mm-etiquetas
// e o mental-madness-mvp com dado órfão pra sempre (contrato:
// docs/api-contracts/06-external-order-delete.md).
//
// Ordem: primeiro tenta desfazer nas duas pontas externas (best-effort —
// uma falha aqui não impede o pedido de ser apagado, que é o efeito mais
// importante e o que o operador está vendo na tela), só então apaga de
// verdade via delete_order. audit_events grava o resultado de cada ponta
// pra dar pra saber depois se alguma ficou órfã sem vasculhar log de
// function.
//
// Exige sessão de usuário autenticado (verify_jwt=true, padrão do gateway,
// igual register-coupon-sale) — a RPC delete_order já é security definer e
// usa auth.uid() pro audit log, então repassamos o Authorization recebido
// pra ela em vez de usar service_role, que perderia esse contexto.
//
// Deploy:
//   npx supabase functions deploy delete-order --project-ref yriimdzhvohlqdgigbbg
// (reaproveita EXTERNAL_ORDERS_SECRET/ETIQUETAS_FUNCTIONS_URL e
// EXTERNAL_ORDER_SALE_SECRET/MVP_FUNCTIONS_URL já configurados pra
// send-to-shipping/register-coupon-sale — nenhum secret novo.)
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EXTERNAL_ORDERS_SECRET = Deno.env.get("EXTERNAL_ORDERS_SECRET") ?? "";
const ETIQUETAS_FUNCTIONS_URL = Deno.env.get("ETIQUETAS_FUNCTIONS_URL") ?? "";
const EXTERNAL_ORDER_SALE_SECRET = Deno.env.get("EXTERNAL_ORDER_SALE_SECRET") ?? "";
const MVP_FUNCTIONS_URL = Deno.env.get("MVP_FUNCTIONS_URL") ?? "";

interface RequestBody {
  order_id?: string;
}

type SyncResult = "synced" | "not_linked" | "error";

async function cancelInEtiquetas(orderId: string): Promise<SyncResult> {
  if (!ETIQUETAS_FUNCTIONS_URL || !EXTERNAL_ORDERS_SECRET) return "not_linked";
  try {
    const res = await fetch(`${ETIQUETAS_FUNCTIONS_URL}/functions/v1/external-order-intake`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${EXTERNAL_ORDERS_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ externalOrderId: orderId, reason: "Pedido excluído no Vendas Externas" }),
    });
    if (!res.ok) {
      console.error("delete-order: falha ao cancelar no mm-etiquetas", await res.text().catch(() => ""));
      return "error";
    }
    return "synced";
  } catch (err) {
    console.error("delete-order: erro de rede ao cancelar no mm-etiquetas", err);
    return "error";
  }
}

async function cancelCommission(orderId: string): Promise<SyncResult> {
  if (!MVP_FUNCTIONS_URL || !EXTERNAL_ORDER_SALE_SECRET) return "not_linked";
  try {
    const res = await fetch(`${MVP_FUNCTIONS_URL}/functions/v1/register-external-order-sale`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${EXTERNAL_ORDER_SALE_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ external_order_id: orderId }),
    });
    if (!res.ok) {
      console.error("delete-order: falha ao reverter comissão no mvp", await res.text().catch(() => ""));
      return "error";
    }
    return "synced";
  } catch (err) {
    console.error("delete-order: erro de rede ao reverter comissão no mvp", err);
    return "error";
  }
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
    .select("id, public_number, customer_name, shipping_status, coupon_sale_status")
    .eq("id", order_id)
    .maybeSingle();

  if (orderError || !order) {
    return jsonResponse({ error: "order_not_found" }, 404);
  }

  const etiquetasResult: SyncResult = order.shipping_status === "sent" ? await cancelInEtiquetas(order.id) : "not_linked";
  const commissionResult: SyncResult = order.coupon_sale_status === "registered" ? await cancelCommission(order.id) : "not_linked";

  // Repassa o JWT de quem chamou (não service_role) só nessa chamada final,
  // pra delete_order continuar enxergando auth.uid() certo no audit log —
  // mesma RPC, mesmo contrato, só trocando quem invoca.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { error: deleteError } = await userClient.rpc("delete_order", { p_order_id: order_id });
  if (deleteError) {
    console.error("delete-order: falha na RPC delete_order", deleteError);
    return jsonResponse({ error: "delete_failed" }, 500);
  }

  await adminClient.from("audit_events").insert({
    entity_type: "order",
    entity_id: order_id,
    action: "deleted_synced",
    metadata: {
      public_number: order.public_number,
      customer_name: order.customer_name,
      mm_etiquetas: etiquetasResult,
      commission: commissionResult,
    },
  });

  return jsonResponse({ ok: true, mm_etiquetas: etiquetasResult, commission: commissionResult });
});
