// ============================================================================
// Edge Function: integration-callback
//
// Recebe eventos de status de envio do mm-etiquetas (contrato em
// docs/api-contracts/04-shipping-callback.md). Três eventos:
//
// - "shipping.status_changed": status bruto do orders_shipping de lá
//   (approved/cart_created/.../tracking_synced/held/failed/archived) —
//   grava em orders.shipping_stage, alimenta as abas Fila de aprovação/
//   Liberados/Rastreio/Postados da tela de Pedidos.
// - "shipping.posted": pedido postado na transportadora — grava
//   orders.shipping_posted_at.
// - "shipping.tracking_synced": rastreio liberado pro cliente — grava
//   tracking_code (e shipping_stage, mesma info) e manda o e-mail de aviso
//   via Resend, se o pedido tiver e-mail e ainda não tiver sido avisado.
//   Sem RESEND_API_KEY configurada, só loga e pula o envio — não quebra o
//   callback (o mm-etiquetas não deve ver isso como falha e ficar
//   retentando à toa).
//
// Auth: HMAC-SHA256 hex do corpo bruto em X-Signature, secret
// INTEGRATION_CALLBACK_SECRET compartilhado com o mm-etiquetas (ver
// _shared/hmac.ts). verify_jwt=false (não é um usuário logado chamando).
//
// Deploy (--no-verify-jwt: quem chama é o mm-etiquetas com secret próprio,
// não um usuário logado com JWT do Supabase — mesmo motivo de
// shopify-webhook/reconciliation-cron no mm-etiquetas):
//   npx supabase functions deploy integration-callback --no-verify-jwt --project-ref yriimdzhvohlqdgigbbg
//   npx supabase secrets set INTEGRATION_CALLBACK_SECRET=<secret> --project-ref yriimdzhvohlqdgigbbg
//   npx supabase secrets set RESEND_API_KEY=<key> RESEND_FROM_EMAIL=pedidos@m3ntalmadness.com --project-ref yriimdzhvohlqdgigbbg
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { verifyHmacHex } from "../_shared/hmac.ts";
import { buildTrackingEmailHtml } from "../_shared/emailTemplates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const INTEGRATION_CALLBACK_SECRET = Deno.env.get("INTEGRATION_CALLBACK_SECRET") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "";

interface CallbackPayload {
  eventId?: string;
  sourceOrderId?: string;
  event?: string;
  status?: string;
  occurredAt?: string;
  metadata?: {
    trackingCode?: string | null;
    labelUrl?: string | null;
    carrierTrackingUrl?: string | null;
    postedAt?: string | null;
  };
}

// Mesmo enum do check constraint da coluna orders.shipping_stage
// (migração 0013) — valida antes de gravar pra nunca quebrar o callback
// com um 500 de constraint por causa de um status que a Vendas Externas
// ainda não conhece (ex.: o mm-etiquetas ganhar um status novo no enum).
const VALID_SHIPPING_STAGES = new Set([
  "approved", "cart_created", "purchased", "label_generated",
  "tracking_ready", "tracking_synced", "held", "failed", "archived",
]);

function log(fields: Record<string, unknown>, msg: string) {
  console.log(JSON.stringify({ msg, ...fields }));
}

async function sendTrackingEmail(to: string, customerName: string, publicNumber: number, trackingCode: string): Promise<boolean> {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    log({ to, publicNumber }, "resend_not_configured_skipping_email");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Mental Madness <${RESEND_FROM_EMAIL}>`,
        to: [to],
        subject: `Seu pedido #${publicNumber} já está a caminho`,
        html: buildTrackingEmailHtml({ customerName, publicNumber, trackingCode }),
      }),
    });
    if (!res.ok) {
      log({ to, publicNumber, status: res.status, body: await res.text() }, "resend_call_failed");
      return false;
    }
    log({ to, publicNumber }, "resend_call_succeeded");
    return true;
  } catch (err) {
    log({ to, publicNumber, err: String(err) }, "resend_call_errored");
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");
  const valid = await verifyHmacHex(rawBody, signature, INTEGRATION_CALLBACK_SECRET);
  if (!valid) {
    return jsonResponse({ error: "invalid_signature" }, 401);
  }

  let body: CallbackPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  if (!body.eventId || !body.sourceOrderId || !body.event) {
    return jsonResponse({ error: "missing_required_fields" }, 400);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Idempotência: se já vimos esse eventId, responde 200 sem reprocessar
  // (o mm-etiquetas reenvia com retry, então isso é esperado acontecer).
  const { data: existingEvent } = await adminClient
    .from("integration_callback_events")
    .select("event_id")
    .eq("event_id", body.eventId)
    .maybeSingle();
  if (existingEvent) {
    log({ eventId: body.eventId }, "callback_event_already_processed");
    return jsonResponse({ received: true });
  }

  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("id, public_number, customer_name, email, tracking_notified_at")
    .eq("id", body.sourceOrderId)
    .maybeSingle();

  if (orderError || !order) {
    log({ sourceOrderId: body.sourceOrderId, event: body.event }, "callback_order_not_found");
    // Ainda registra o evento como recebido — não é um erro de assinatura,
    // é um pedido que esse sistema não conhece (não deveria retentar).
    await adminClient.from("integration_callback_events").insert({
      event_id: body.eventId,
      order_id: null,
      event_type: body.event,
    });
    return jsonResponse({ received: true, warning: "order_not_found" });
  }

  const trackingCode = body.metadata?.trackingCode ?? null;
  const postedAt = body.metadata?.postedAt ?? null;

  if (body.event === "shipping.status_changed" || body.event === "shipping.tracking_synced") {
    const patch: Record<string, unknown> = {};
    if (body.status && VALID_SHIPPING_STAGES.has(body.status)) patch.shipping_stage = body.status;
    if (postedAt) patch.shipping_posted_at = postedAt;
    if (Object.keys(patch).length > 0) {
      await adminClient.from("orders").update(patch).eq("id", order.id);
    }
  }

  if (body.event === "shipping.posted" && postedAt) {
    await adminClient.from("orders").update({ shipping_posted_at: postedAt }).eq("id", order.id);
  }

  if (body.event === "shipping.tracking_synced" && trackingCode) {
    await adminClient.from("orders").update({ tracking_code: trackingCode }).eq("id", order.id);

    if (!order.tracking_notified_at && order.email) {
      const sent = await sendTrackingEmail(order.email, order.customer_name, order.public_number, trackingCode);
      if (sent) {
        await adminClient.from("orders").update({ tracking_notified_at: new Date().toISOString() }).eq("id", order.id);
      }
    }
  }

  await adminClient.from("audit_events").insert({
    entity_type: "order",
    entity_id: order.id,
    action: "shipping_callback_received",
    metadata: { event: body.event, status: body.status ?? null, hasTrackingCode: !!trackingCode },
  });

  await adminClient.from("integration_callback_events").insert({
    event_id: body.eventId,
    order_id: order.id,
    event_type: body.event,
  });

  return jsonResponse({ received: true });
});
