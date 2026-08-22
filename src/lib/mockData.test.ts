import { describe, expect, it } from "vitest";
import { MOCK_ORDER_ITEMS } from "./mockData";
import { CATALOG_SNAPSHOT } from "./catalogSnapshot";

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
