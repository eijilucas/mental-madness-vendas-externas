import type { Order } from "@/types/database";

export type ShippingTab = "fila_aprovacao" | "liberados" | "postados" | "rastreio";

/** Em qual aba de acompanhamento de envio esse pedido está — um pipeline
 * linear e mutuamente exclusivo (Fila de aprovação → Liberados → Postados
 * → Rastreio), diferente do painel do próprio mm-etiquetas (onde Liberados
 * e Rastreio podem se sobrepor). Aqui a última etapa é o que importa pro
 * operador: "o cliente já foi avisado?" — assim que o e-mail de rastreio é
 * enviado (tracking_notified_at preenchido), o pedido para em Rastreio e
 * não aparece mais em Liberados/Postados, mesmo que o mm-etiquetas ainda
 * não tenha marcado posted_at.
 *
 * Vazio pra pedidos que nunca chegaram a ser enviados pro mm-etiquetas
 * (ainda pending/failed no envio, ou nem foi criado). */
export function shippingTabs(order: Order): Set<ShippingTab> {
  if (order.status !== "created" || order.shipping_status !== "sent") return new Set();
  if (order.tracking_notified_at) return new Set(["rastreio"]);
  if (order.shipping_stage === null) return new Set(["fila_aprovacao"]);
  return new Set([order.shipping_posted_at ? "postados" : "liberados"]);
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
  if (order.tracking_notified_at) return "Cliente avisado por e-mail";
  if (order.shipping_posted_at) return "Postado";
  if (order.shipping_stage === null) return "Fila de aprovação";
  return SHIPPING_STAGE_LABELS[order.shipping_stage];
}
