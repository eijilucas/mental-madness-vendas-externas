// ============================================================================
// Edge Function: manage-users
//
// CRUD de operadores (Supabase Auth + tabela profiles) pra tela de
// Configurações — hoje isso só era possível mexendo direto no dashboard do
// Supabase. Admin-only: valida a sessão de quem chama (JWT do gateway) e
// confere profiles.role === 'admin' antes de fazer qualquer coisa. Usa a
// service_role key só aqui dentro (nunca no navegador) porque
// auth.admin.* (criar usuário, resetar senha, listar e-mail) não é
// alcançável pelo client normal.
//
// Deploy:
//   npx supabase functions deploy manage-users --project-ref yriimdzhvohlqdgigbbg
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

type Role = "admin" | "operator" | "viewer";

interface RequestBody {
  action?: "list" | "create" | "update" | "reset_password";
  id?: string;
  email?: string;
  password?: string;
  name?: string;
  role?: Role;
  active?: boolean;
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

  // Identifica quem está chamando (JWT do próprio usuário, já validado pelo
  // gateway) e confere se é admin antes de fazer qualquer coisa.
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();
  if (callerError || !caller) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: callerProfile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .maybeSingle();
  if (callerProfile?.role !== "admin") {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  if (body.action === "list") {
    const [{ data: profiles, error: profilesError }, { data: authUsers, error: authError }] = await Promise.all([
      adminClient.from("profiles").select("*").order("created_at", { ascending: true }),
      adminClient.auth.admin.listUsers({ perPage: 200 }),
    ]);
    if (profilesError || authError) {
      return jsonResponse({ error: "list_failed" }, 500);
    }
    const emailById = new Map(authUsers.users.map((u) => [u.id, u.email ?? null]));
    const users = (profiles ?? []).map((p) => ({ ...p, email: emailById.get(p.id) ?? null }));
    return jsonResponse({ users });
  }

  if (body.action === "create") {
    if (!body.email || !body.password || !body.name || !body.role) {
      return jsonResponse({ error: "missing_required_fields" }, 400);
    }
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      return jsonResponse({ error: "create_user_failed", detail: createError?.message }, 400);
    }
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: created.user.id,
      name: body.name,
      role: body.role,
      active: true,
    });
    if (profileError) {
      // Não deixa órfão: usuário de auth sem profile trava o login (0004
      // load Profile falha) — melhor desfazer do que meio-criado.
      await adminClient.auth.admin.deleteUser(created.user.id);
      return jsonResponse({ error: "create_profile_failed" }, 500);
    }
    return jsonResponse({ ok: true, id: created.user.id });
  }

  if (body.action === "update") {
    if (!body.id) return jsonResponse({ error: "id_required" }, 400);
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.role !== undefined) patch.role = body.role;
    if (body.active !== undefined) patch.active = body.active;
    if (Object.keys(patch).length === 0) return jsonResponse({ error: "nothing_to_update" }, 400);

    const { error } = await adminClient.from("profiles").update(patch).eq("id", body.id);
    if (error) return jsonResponse({ error: "update_failed" }, 500);
    return jsonResponse({ ok: true });
  }

  if (body.action === "reset_password") {
    if (!body.id || !body.password) return jsonResponse({ error: "id_and_password_required" }, 400);
    const { error } = await adminClient.auth.admin.updateUserById(body.id, { password: body.password });
    if (error) return jsonResponse({ error: "reset_password_failed" }, 500);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "unknown_action" }, 400);
});
