import { describe, expect, it } from "vitest";
import { orderStatusBadge, shippingStageLabel, shippingTabs } from "./shippingStage";
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
    tracking_notified_at: null,
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

  it("qualquer estágio de processamento sem posted_at cai em Liberados", () => {
    for (const stage of ["approved", "cart_created", "purchased", "label_generated", "tracking_ready", "failed"] as const) {
      const order = makeOrder({ shipping_stage: stage });
      expect(shippingTabs(order)).toEqual(new Set(["liberados"]));
    }
  });

  it("com posted_at preenchido, sai de Liberados e vai pra Postados", () => {
    const order = makeOrder({ shipping_stage: "tracking_ready", shipping_posted_at: "2026-09-01T10:00:00Z" });
    expect(shippingTabs(order)).toEqual(new Set(["postados"]));
  });

  it("assim que o e-mail de rastreio é enviado, para em Rastreio — independente de posted_at/estágio", () => {
    const semPostar = makeOrder({ shipping_stage: "tracking_synced", tracking_notified_at: "2026-09-01T11:00:00Z" });
    expect(shippingTabs(semPostar)).toEqual(new Set(["rastreio"]));

    const jaPostado = makeOrder({
      shipping_stage: "tracking_synced",
      shipping_posted_at: "2026-09-01T10:00:00Z",
      tracking_notified_at: "2026-09-01T11:00:00Z",
    });
    expect(shippingTabs(jaPostado)).toEqual(new Set(["rastreio"]));
  });

  it("held/archived caem em Liberados também (não têm aba própria — tratados como 'ainda em processamento')", () => {
    expect(shippingTabs(makeOrder({ shipping_stage: "held" }))).toEqual(new Set(["liberados"]));
    expect(shippingTabs(makeOrder({ shipping_stage: "archived" }))).toEqual(new Set(["liberados"]));
  });
});

describe("shippingStageLabel", () => {
  it("null pra pedido nunca enviado", () => {
    expect(shippingStageLabel(makeOrder({ shipping_status: "pending" }))).toBeNull();
  });

  it("Fila de aprovação antes do primeiro callback", () => {
    expect(shippingStageLabel(makeOrder({ shipping_stage: null }))).toBe("Fila de aprovação");
  });

  it("Postado quando posted_at está preenchido e ainda não avisou o cliente", () => {
    expect(
      shippingStageLabel(makeOrder({ shipping_stage: "label_generated", shipping_posted_at: "2026-09-01T10:00:00Z" })),
    ).toBe("Postado");
  });

  it("rótulo do estágio quando não postado nem avisado ainda", () => {
    expect(shippingStageLabel(makeOrder({ shipping_stage: "tracking_ready" }))).toBe("Rastreio pronto");
  });

  it("cliente avisado tem prioridade sobre qualquer outro estágio", () => {
    expect(
      shippingStageLabel(
        makeOrder({
          shipping_stage: "tracking_synced",
          shipping_posted_at: "2026-09-01T10:00:00Z",
          tracking_notified_at: "2026-09-01T11:00:00Z",
        }),
      ),
    ).toBe("Cliente avisado por e-mail");
  });
});

describe("orderStatusBadge", () => {
  it("Não criado, tom danger, pra pedido que falhou na criação", () => {
    expect(orderStatusBadge(makeOrder({ status: "not_created", shipping_status: "pending" }))).toEqual({
      label: "Não criado",
      tone: "danger",
    });
  });

  it("Pedido criado, tom success, quando ainda não foi enviado pro mm-etiquetas", () => {
    expect(orderStatusBadge(makeOrder({ shipping_status: "pending" }))).toEqual({
      label: "Pedido criado",
      tone: "success",
    });
  });

  it("Fila de aprovação, tom warning, logo após o envio", () => {
    expect(orderStatusBadge(makeOrder({ shipping_stage: null }))).toEqual({
      label: "Fila de aprovação",
      tone: "warning",
    });
  });

  it("Pedido enviado, tom info, pros estágios iniciais de processamento", () => {
    expect(orderStatusBadge(makeOrder({ shipping_stage: "cart_created" }))).toEqual({
      label: "Pedido enviado",
      tone: "info",
    });
  });

  it("Rastreio emitido, tom info — o cenário que ficava escondido dentro de Liberados antes", () => {
    expect(orderStatusBadge(makeOrder({ shipping_stage: "tracking_ready" }))).toEqual({
      label: "Rastreio emitido",
      tone: "info",
    });
    expect(orderStatusBadge(makeOrder({ shipping_stage: "tracking_synced" }))).toEqual({
      label: "Rastreio emitido",
      tone: "info",
    });
  });

  it("Postado, tom success", () => {
    expect(
      orderStatusBadge(makeOrder({ shipping_stage: "label_generated", shipping_posted_at: "2026-09-01T10:00:00Z" })),
    ).toEqual({ label: "Postado", tone: "success" });
  });

  it("Cliente avisado, tom success, tem prioridade sobre tudo", () => {
    expect(
      orderStatusBadge(
        makeOrder({
          shipping_stage: "tracking_synced",
          shipping_posted_at: "2026-09-01T10:00:00Z",
          tracking_notified_at: "2026-09-01T11:00:00Z",
        }),
      ),
    ).toEqual({ label: "Cliente avisado", tone: "success" });
  });
});
