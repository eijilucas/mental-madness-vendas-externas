import { describe, expect, it } from "vitest";
import { shippingStageLabel, shippingTabs } from "./shippingStage";
import type { Order } from "@/types/database";

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    public_number: 1,
    status: "created",
    customer_name: "Cliente Teste",
    cpf: "00000000000",
    email: null,
    phone: "11999999999",
    source: "whatsapp",
    source_identifier: "9999",
    original_message: "",
    subtotal: 0,
    shipping_amount: 0,
    discount_amount: 0,
    total_amount: 0,
    failure_reason: null,
    coupon_code: null,
    coupon_sale_status: "none",
    shipping_status: "sent",
    shipping_last_error: null,
    shipping_stage: null,
    shipping_posted_at: null,
    tracking_code: null,
    group_id: null,
    created_by: "user-1",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("shippingTabs", () => {
  it("pedido não enviado pro mm-etiquetas (ainda pending) não entra em nenhuma aba", () => {
    const order = makeOrder({ shipping_status: "pending" });
    expect(shippingTabs(order)).toEqual(new Set());
  });

  it("pedido não criado não entra em nenhuma aba, mesmo com shipping_status sent por engano", () => {
    const order = makeOrder({ status: "not_created", shipping_status: "sent" });
    expect(shippingTabs(order)).toEqual(new Set());
  });

  it("sem callback ainda (shipping_stage null) cai em Fila de aprovação", () => {
    const order = makeOrder({ shipping_stage: null });
    expect(shippingTabs(order)).toEqual(new Set(["fila_aprovacao"]));
  });

  it("approved/cart_created/purchased/label_generated sem posted_at caem em Liberados só", () => {
    for (const stage of ["approved", "cart_created", "purchased", "label_generated"] as const) {
      const order = makeOrder({ shipping_stage: stage });
      expect(shippingTabs(order)).toEqual(new Set(["liberados"]));
    }
  });

  it("tracking_ready sem posted_at cai em Liberados E Rastreio ao mesmo tempo", () => {
    const order = makeOrder({ shipping_stage: "tracking_ready" });
    expect(shippingTabs(order)).toEqual(new Set(["liberados", "rastreio"]));
  });

  it("failed sem posted_at cai em Liberados E Rastreio (precisa reprocessar/reenviar)", () => {
    const order = makeOrder({ shipping_stage: "failed" });
    expect(shippingTabs(order)).toEqual(new Set(["liberados", "rastreio"]));
  });

  it("com posted_at preenchido, sai de Liberados e vai pra Postados (mesmo em tracking_ready)", () => {
    const order = makeOrder({ shipping_stage: "tracking_ready", shipping_posted_at: "2026-09-01T10:00:00Z" });
    expect(shippingTabs(order)).toEqual(new Set(["postados", "rastreio"]));
  });

  it("held/archived não caem em nenhuma das 4 abas (não há aba própria pra eles ainda)", () => {
    expect(shippingTabs(makeOrder({ shipping_stage: "held" }))).toEqual(new Set());
    expect(shippingTabs(makeOrder({ shipping_stage: "archived" }))).toEqual(new Set());
  });
});

describe("shippingStageLabel", () => {
  it("null pra pedido nunca enviado", () => {
    expect(shippingStageLabel(makeOrder({ shipping_status: "pending" }))).toBeNull();
  });

  it("Fila de aprovação antes do primeiro callback", () => {
    expect(shippingStageLabel(makeOrder({ shipping_stage: null }))).toBe("Fila de aprovação");
  });

  it("Postado tem prioridade sobre o estágio quando posted_at está preenchido", () => {
    expect(
      shippingStageLabel(makeOrder({ shipping_stage: "label_generated", shipping_posted_at: "2026-09-01T10:00:00Z" })),
    ).toBe("Postado");
  });

  it("rótulo do estágio quando não postado ainda", () => {
    expect(shippingStageLabel(makeOrder({ shipping_stage: "tracking_ready" }))).toBe("Rastreio pronto");
  });
});
