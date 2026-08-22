import { describe, expect, it } from "vitest";
import { MOCK_ORDERS, MOCK_ORDER_ADDRESSES, MOCK_ORDER_ITEMS } from "./mockData";
import { CATALOG_SNAPSHOT } from "./catalogSnapshot";
import { isValidCpf, isValidEmail, isValidPhone } from "./parser/normalizers";

/**
 * Trava a classe de bug encontrada em 2026-08-22: itens de pedido de
 * demonstração referenciando produtos inventados (nomes do protótipo
 * Framer) em vez do catálogo real do estoque. Qualquer novo item mockado
 * precisa apontar para um produto/variante que realmente existe no
 * snapshot puxado do Supabase real.
 */
describe("dados de demonstração — consistência com o catálogo real", () => {
  const catalogProductIds = new Set(CATALOG_SNAPSHOT.map((p) => p.id));
  const variantKeysByProduct = new Map(
    CATALOG_SNAPSHOT.map((p) => [p.id, new Set(p.variants.map((v) => v.variantKey))]),
  );

  const allItems = Object.values(MOCK_ORDER_ITEMS).flat();

  it("todo item mockado com catalog_product_id aponta para um produto real do catálogo", () => {
    for (const item of allItems) {
      if (!item.catalog_product_id) continue;
      expect(
        catalogProductIds.has(item.catalog_product_id),
        `catalog_product_id "${item.catalog_product_id}" (item "${item.product_name}") não existe em CATALOG_SNAPSHOT`,
      ).toBe(true);
    }
  });

  it("nome do produto no item mockado bate com o nome real do catálogo", () => {
    const productById = new Map(CATALOG_SNAPSHOT.map((p) => [p.id, p]));
    for (const item of allItems) {
      if (!item.catalog_product_id) continue;
      const product = productById.get(item.catalog_product_id);
      expect(product).toBeDefined();
      expect(item.product_name).toBe(product?.name);
    }
  });

  it("tamanho do item mockado existe como variante real do produto", () => {
    for (const item of allItems) {
      if (!item.catalog_product_id) continue;
      const variantKeys = variantKeysByProduct.get(item.catalog_product_id);
      expect(variantKeys).toBeDefined();
      const expectedKey = item.color ? `${item.size}::${item.color}` : item.size;
      expect(
        variantKeys?.has(expectedKey ?? ""),
        `variante "${expectedKey}" não existe no produto "${item.product_name}"`,
      ).toBe(true);
    }
  });

  it("nenhum item mockado usa sku inventado (catálogo real não tem essa coluna)", () => {
    for (const item of allItems) {
      expect(item.sku).toBeNull();
    }
  });
});

/**
 * Trava a classe de bug encontrada em 2026-08-22: pedido #1045 marcado
 * como "criado" mas sem CPF, telefone, e-mail, endereço ou itens — um
 * pedido só chega a "criado" depois de passar todas as validações, então
 * o dado de demonstração tem que ser coerente com o próprio status.
 */
describe("dados de demonstração — pedido criado tem que ter dados completos e válidos", () => {
  const createdOrders = MOCK_ORDERS.filter(({ order }) => order.status === "created");

  it("todo pedido criado tem nome, CPF, telefone e e-mail válidos", () => {
    for (const { order } of createdOrders) {
      expect(order.customer_name.trim(), `pedido #${order.public_number}: nome vazio`).not.toBe("");
      expect(isValidCpf(order.cpf), `pedido #${order.public_number}: CPF inválido`).toBe(true);
      expect(isValidPhone(order.phone), `pedido #${order.public_number}: telefone inválido`).toBe(true);
      if (order.email) {
        expect(isValidEmail(order.email), `pedido #${order.public_number}: e-mail inválido`).toBe(true);
      }
    }
  });

  it("todo pedido criado tem endereço com rua, número, cidade e UF", () => {
    for (const { order } of createdOrders) {
      const address = MOCK_ORDER_ADDRESSES[order.id];
      expect(address, `pedido #${order.public_number}: sem endereço`).toBeDefined();
      expect(address?.street.trim(), `pedido #${order.public_number}: rua vazia`).not.toBe("");
      expect(address?.number.trim(), `pedido #${order.public_number}: número vazio`).not.toBe("");
      expect(address?.city.trim(), `pedido #${order.public_number}: cidade vazia`).not.toBe("");
      expect(address?.state.trim(), `pedido #${order.public_number}: UF vazia`).not.toBe("");
    }
  });

  it("todo pedido criado tem ao menos um item vinculado a uma variante real", () => {
    for (const { order } of createdOrders) {
      const items = MOCK_ORDER_ITEMS[order.id];
      expect(items?.length, `pedido #${order.public_number}: sem itens`).toBeGreaterThan(0);
      for (const item of items ?? []) {
        expect(
          item.catalog_product_id,
          `pedido #${order.public_number}: item "${item.product_name}" sem produto do catálogo vinculado`,
        ).not.toBeNull();
      }
    }
  });
});
