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

export type OrderBadgeTone = "success" | "danger" | "warning" | "info" | "neutral";

/** Badge principal da situação do pedido (tabela/card de Pedidos). Antes
 * disso mostrava sempre "Pedido criado", que fica sem sentido numa tela
 * que já filtra só pedidos criados/enviados — agora reflete de verdade em
 * que ponto da jornada de envio o pedido está, incluindo o cenário de
 * "rastreio já emitido, mas o produto ainda não foi postado" (que antes
 * ficava escondido dentro de "Liberados", indistinguível de um pedido que
 * ainda nem tem etiqueta). */
export function orderStatusBadge(order: Order): { label: string; tone: OrderBadgeTone } {
  if (order.status !== "created") return { label: "Não criado", tone: "danger" };
  if (order.shipping_status !== "sent") return { label: "Pedido criado", tone: "success" };
  if (order.tracking_notified_at) return { label: "Cliente avisado", tone: "success" };
  if (order.shipping_posted_at) return { label: "Postado", tone: "success" };
  if (order.shipping_stage === "tracking_ready" || order.shipping_stage === "tracking_synced") {
    return { label: "Rastreio emitido", tone: "info" };
  }
  if (order.shipping_stage === null) return { label: "Fila de aprovação", tone: "warning" };
  return { label: "Pedido enviado", tone: "info" };
}
