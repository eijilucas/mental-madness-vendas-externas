// ============================================================================
// Edge Function: register-jackpot-sale
//
// Manda a venda pro Jackpot (mental-lucro-liquido), que calcula o lucro
// líquido. Ele só enxergava venda da Shopify até agora — pedido do Vendas
// Externas nunca passa pelo checkout, então ficava de fora da DRE. Chamada
// depois de criar (NewOrderPage) e depois de editar (EditOrderPage), no
// mesmo lugar de register-coupon-sale. Contrato:
// docs/api-contracts/07-jackpot-lucro-liquido.md
//
// Pedido do grupo "Pedidos dos Membros" NÃO vai pro Jackpot — é peça
// enviada pro time, não é venda (grava jackpot_sale_status='skipped_members').
//
// Exige sessão de usuário autenticado (verify_jwt=true, padrão do gateway,
// igual register-coupon-sale).
//
// Deploy:
//   npx supabase functions deploy register-jackpot-sale --project-ref yriimdzhvohlqdgigbbg
//   npx supabase secrets set EXTERNAL_SALE_SECRET=<secret> JACKPOT_FUNCTIONS_URL=https://vatoeojxpejefxqslgli.supabase.co --project-ref yriimdzhvohlqdgigbbg
// (o mesmo EXTERNAL_SALE_SECRET tem que estar setado no projeto do Jackpot.)
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EXTERNAL_SALE_SECRET = Deno.env.get("EXTERNAL_SALE_SECRET") ?? "";
const JACKPOT_FUNCTIONS_URL = Deno.env.get("JACKPOT_FUNCTIONS_URL") ?? "";

const MEMBERS_GROUP_NAME = "pedidos dos membros";

interface RequestBody {
  order_id?: string;
}

// catalog_product_id é "shopify-<n>" (mesmo id do estoque) — a parte
// numérica é o shopify_product_id que o Jackpot usa pra bater custo em
// product_costs. Item sem match no catálogo fica sem product_id (entra na
// receita, sem custo direto batido).
function parseShopifyProductId(catalogId: string | null): number | null {
  if (!catalogId) return null;
  const m = /^shopify-(\d+)$/.exec(catalogId);
  return m ? Number(m[1]) : null;
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
  if (!body.order_id) {
    return jsonResponse({ error: "order_id_required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, status, created_at, coupon_sale_status, group_id")
    .eq("id", body.order_id)
    .maybeSingle();
  if (orderErr || !order) {
    return jsonResponse({ error: "order_not_found" }, 404);
  }

  // Só pedido efetivamente criado conta como venda.
  if (order.status !== "created") {
    return jsonResponse({ status: "skipped" });
  }

  if (order.group_id) {
    const { data: group } = await admin
      .from("order_groups")
      .select("name")
      .eq("id", order.group_id)
      .maybeSingle();
    if ((group?.name ?? "").trim().toLowerCase() === MEMBERS_GROUP_NAME) {
      await admin.from("orders").update({ jackpot_sale_status: "skipped_members" }).eq("id", order.id);
      return jsonResponse({ status: "skipped_members" });
    }
  }

  const { data: items, error: itemsErr } = await admin
    .from("order_items")
    .select("id, catalog_product_id, product_name, quantity, unit_price")
    .eq("order_id", order.id);
  if (itemsErr) {
    return jsonResponse({ error: "items_lookup_failed" }, 500);
  }

  const catalogIds = [
    ...new Set((items ?? []).map((i) => i.catalog_product_id).filter((v): v is string => !!v)),
  ];
  const lineByCatalogId = new Map<string, "basico" | "exclusivo">();
  if (catalogIds.length > 0) {
    const { data: cat } = await admin.from("catalog_products").select("id, type").in("id", catalogIds);
    for (const c of cat ?? []) lineByCatalogId.set(c.id, c.type as "basico" | "exclusivo");
  }

  const payloadItems = (items ?? []).map((it) => ({
    externalItemId: it.id,
    shopifyProductId: parseShopifyProductId(it.catalog_product_id),
    productName: it.product_name,
    productLine: it.catalog_product_id ? lineByCatalogId.get(it.catalog_product_id) ?? null : null,
    quantity: it.quantity,
    grossAmount: Number(it.unit_price) * it.quantity,
  }));

  let status: "registered" | "error" = "error";
  if (JACKPOT_FUNCTIONS_URL && EXTERNAL_SALE_SECRET) {
    try {
      const res = await fetch(`${JACKPOT_FUNCTIONS_URL}/functions/v1/register-external-sale`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${EXTERNAL_SALE_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalOrderId: order.id,
          saleDate: order.created_at,
          hasCoupon: order.coupon_sale_status === "registered",
          items: payloadItems,
        }),
      });
      status = res.ok ? "registered" : "error";
      if (!res.ok) {
        console.error("register-jackpot-sale: Jackpot respondeu", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.error("register-jackpot-sale: erro de rede ao chamar o Jackpot", err);
    }
  } else {
    console.error("register-jackpot-sale: JACKPOT_FUNCTIONS_URL/EXTERNAL_SALE_SECRET não configurados");
  }

  await admin.from("orders").update({ jackpot_sale_status: status }).eq("id", order.id);
  await admin.from("audit_events").insert({
    entity_type: "order",
    entity_id: order.id,
    action: "jackpot_sale_attempt",
    metadata: { result: status, items: payloadItems.length },
  });

  return jsonResponse({ status });
});
