import type { Order } from "@/types/database";

// Mesma regra de bucket usada nas abas Fila de aprovação/Liberados/
// Rastreio/Postados do próprio mm-etiquetas (panel-static/app.js) — não
// são buckets mutuamente exclusivos por lá (um pedido tracking_ready
// aparece em Liberados E em Rastreio ao mesmo tempo), então aqui também um
// pedido pode "pertencer" a mais de uma aba.
const PROCESSING_STAGES = new Set([
  "approved",
  "cart_created",
  "purchased",
  "label_generated",
  "tracking_ready",
  "tracking_synced",
  "failed",
]);

export type ShippingTab = "fila_aprovacao" | "liberados" | "rastreio" | "postados";

/** Em quais abas de acompanhamento de envio esse pedido aparece. Vazio pra
 * pedidos que nunca chegaram a ser enviados pro mm-etiquetas (ainda
 * pending/failed no envio, ou nem foi criado). */
export function shippingTabs(order: Order): Set<ShippingTab> {
  const tabs = new Set<ShippingTab>();

  if (order.status !== "created" || order.shipping_status !== "sent") return tabs;

  if (order.shipping_stage === null) {
    tabs.add("fila_aprovacao");
    return tabs;
  }

  if (PROCESSING_STAGES.has(order.shipping_stage)) {
    tabs.add(order.shipping_posted_at ? "postados" : "liberados");
  }
  if (order.shipping_stage === "tracking_ready" || order.shipping_stage === "failed") {
    tabs.add("rastreio");
  }

  return tabs;
}

const SHIPPING_STAGE_LABELS: Record<NonNullable<Order["shipping_stage"]>, string> = {
  approved: "Aprovado",
  cart_created: "Carrinho criado",
  purchased: "Frete comprado",
  label_generated: "Etiqueta gerada",
  tracking_ready: "Rastreio pronto",
  tracking_synced: "Rastreio enviado",
  held: "Em espera",
  failed: "Falhou",
  archived: "Arquivado",
};

/** Rótulo curto pra mostrar o estágio de envio no detalhe/lista do pedido. */
export function shippingStageLabel(order: Order): string | null {
  if (order.status !== "created" || order.shipping_status !== "sent") return null;
  if (order.shipping_posted_at) return "Postado";
  if (order.shipping_stage === null) return "Fila de aprovação";
  return SHIPPING_STAGE_LABELS[order.shipping_stage];
}
