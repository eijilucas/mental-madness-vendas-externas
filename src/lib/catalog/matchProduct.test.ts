import { describe, expect, it } from "vitest";
import { matchCatalogItem } from "./matchProduct";
import { CATALOG_SNAPSHOT } from "@/lib/catalogSnapshot";

describe("matchCatalogItem", () => {
  it('casa "Calça Hell Hounds" (texto do cliente) com o produto real do drop', () => {
    const result = matchCatalogItem("Calça Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(result?.product.name).toBe("Calça Oversized - Hell Hounds Drop");
    expect(result?.variantKey).toBe("M");
  });

  it("não casa quando o tamanho pedido não existe nesse produto", () => {
    // Moletom Zip Up Gola Alta - Hell Hounds só tem PP/P/M/G, sem GG.
    const result = matchCatalogItem("Moletom Zip Up Gola Alta Hell Hounds", "GG", CATALOG_SNAPSHOT);
    expect(result).toBeNull();
  });

  it("não casa com texto totalmente sem relação a nenhum produto", () => {
    const result = matchCatalogItem("Produto que não existe de jeito nenhum", "M", CATALOG_SNAPSHOT);
    expect(result).toBeNull();
  });

  it("não casa com produto inativo", () => {
    const inactiveCatalog = CATALOG_SNAPSHOT.map((p) =>
      p.name.includes("Hell Hounds") ? { ...p, active: false } : p,
    );
    const result = matchCatalogItem("Calça Hell Hounds", "M", inactiveCatalog);
    expect(result).toBeNull();
  });
});
