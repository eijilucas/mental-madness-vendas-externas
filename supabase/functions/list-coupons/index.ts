import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Busca todos os cupons únicos já usados, sem NULL
  const { data, error } = await admin
    .from("orders")
    .select("coupon_code")
    .not("coupon_code", "is", null);

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  // Deduplica, remove vazios e ordena
  const unique = [
    ...new Set(
      (data ?? [])
        .map((o: { coupon_code: string | null }) => o.coupon_code)
        .filter((code): code is string => Boolean(code?.trim()))
    ),
  ].sort();

  return jsonResponse({ coupons: unique });
});
