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

  it('não casa "casaco Hell Hounds" com a calça do mesmo drop (bug real: palavras do drop não bastam)', () => {
    const result = matchCatalogItem("casaco Hell M Hounds", "M", CATALOG_SNAPSHOT);
    expect(result).toBeNull();
  });

  it("distingue peças diferentes do mesmo drop pelo tipo mencionado", () => {
    const camiseta = matchCatalogItem("Camiseta Oversized Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(camiseta?.product.name).toBe("Camiseta Oversized - Hell Hounds");

    const moletom = matchCatalogItem("Moletom Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(moletom?.product.name).toBe("Moletom Zip Up Gola Alta - Hell Hounds");

    const calca = matchCatalogItem("Calça Hell Hounds", "M", CATALOG_SNAPSHOT);
    expect(calca?.product.name).toBe("Calça Oversized - Hell Hounds Drop");
  });

  it("não casa com produto inativo", () => {
    const inactiveCatalog = CATALOG_SNAPSHOT.map((p) =>
      p.name.includes("Hell Hounds") ? { ...p, active: false } : p,
    );
    const result = matchCatalogItem("Calça Hell Hounds", "M", inactiveCatalog);
    expect(result).toBeNull();
  });
});
