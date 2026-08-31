// ============================================================================
// Edge Function: trigger-catalog-sync
//
// Chamada pelo botão "Solicitar sincronização" da tela de Catálogo. Faz as
// duas pontas num clique só:
//   1. Chama POST /api/catalog/sync no mental-madness-estoque — dispara o
//      sync de verdade com o Shopify (CATALOG_SYNC_SECRET, secret dedicado,
//      nunca exposto ao navegador).
//   2. Espera terminar, relê o catálogo atualizado (GET /api/catalog/variants,
//      CATALOG_READ_SECRET) e grava aqui em catalog_products/catalog_variants
//      — mesma lógica do script manual usado antes, incluindo o filtro de
//      produto duplicado entre a loja básico e a loja exclusivo (mesmo nome
//      cadastrado nas duas — ver docs/decisions).
//
// Exige sessão de usuário autenticado do Vendas Externas (verify_jwt=true,
// padrão do gateway) — qualquer operador logado pode disparar, não é uma
// ação destrutiva.
//
// Deploy:
//   npx supabase functions deploy trigger-catalog-sync --project-ref yriimdzhvohlqdgigbbg
//   npx supabase secrets set CATALOG_SYNC_SECRET=<secret> CATALOG_READ_SECRET=<secret> ESTOQUE_BASE_URL=https://mental-estoque.vercel.app --project-ref yriimdzhvohlqdgigbbg
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CATALOG_SYNC_SECRET = Deno.env.get("CATALOG_SYNC_SECRET") ?? "";
const CATALOG_READ_SECRET = Deno.env.get("CATALOG_READ_SECRET") ?? "";
const ESTOQUE_BASE_URL = Deno.env.get("ESTOQUE_BASE_URL") ?? "https://mental-estoque.vercel.app";

interface EstoqueVariant {
  variantKey: string;
  size: string | null;
  color: string | null;
  estoqueReal: number;
  price: number | null;
}

interface EstoqueProduct {
  id: string;
  name: string;
  type: "basico" | "exclusivo";
  category: string | null;
  drop: { id: string; name: string; status: string } | null;
  active: boolean;
  variants: EstoqueVariant[];
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

  // 1. Dispara o sync real com o Shopify.
  let syncResult: unknown;
  try {
    const res = await fetch(`${ESTOQUE_BASE_URL}/api/catalog/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CATALOG_SYNC_SECRET}` },
    });
    syncResult = await res.json().catch(() => ({}));
    if (!res.ok) {
      return jsonResponse({ error: "estoque_sync_failed", detail: syncResult }, 502);
    }
  } catch (err) {
    console.error("Falha ao chamar mental-madness-estoque (sync):", err);
    return jsonResponse({ error: "network_error_sync" }, 502);
  }

  // 2. Relê o catálogo já atualizado.
  let products: EstoqueProduct[];
  try {
    const res = await fetch(`${ESTOQUE_BASE_URL}/api/catalog/variants`, {
      headers: { Authorization: `Bearer ${CATALOG_READ_SECRET}` },
    });
    if (!res.ok) {
      return jsonResponse({ error: "estoque_read_failed", syncResult }, 502);
    }
    const body = await res.json();
    products = body.products ?? [];
  } catch (err) {
    console.error("Falha ao chamar mental-madness-estoque (read):", err);
    return jsonResponse({ error: "network_error_read", syncResult }, 502);
  }

  // Produto duplicado entre as duas lojas do Shopify (mesmo nome cadastrado
  // na básico E na exclusivo) — fica só a cópia da loja básico.
  const basicoNames = new Set(products.filter((p) => p.type === "basico").map((p) => p.name));
  const dedupedProducts = products.filter((p) => !(p.type === "exclusivo" && basicoNames.has(p.name)));

  const now = new Date().toISOString();
  const productRows = dedupedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    category: p.category,
    drop_id: p.drop ? p.drop.id : null,
    drop_name: p.drop ? p.drop.name : null,
    drop_status: p.drop ? p.drop.status : null,
    active: p.active,
    synced_at: now,
  }));

  const variantRows = dedupedProducts.flatMap((p) =>
    p.variants.map((v) => ({
      product_id: p.id,
      variant_key: v.variantKey,
      size: v.size,
      color: v.color,
      estoque_real: v.estoqueReal,
      price: v.price,
      synced_at: now,
    })),
  );

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { error: productsError } = await adminClient
    .from("catalog_products")
    .upsert(productRows, { onConflict: "id" });
  if (productsError) {
    console.error("Falha ao gravar catalog_products:", productsError);
    return jsonResponse({ error: "db_write_failed_products", syncResult }, 500);
  }

  const { error: variantsError } = await adminClient
    .from("catalog_variants")
    .upsert(variantRows, { onConflict: "product_id,variant_key" });
  if (variantsError) {
    console.error("Falha ao gravar catalog_variants:", variantsError);
    return jsonResponse({ error: "db_write_failed_variants", syncResult }, 500);
  }

  return jsonResponse({
    ok: true,
    syncResult,
    productsCount: productRows.length,
    variantsCount: variantRows.length,
    skippedDuplicates: products.length - dedupedProducts.length,
  });
});
