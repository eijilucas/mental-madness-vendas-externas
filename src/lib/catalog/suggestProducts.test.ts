import { describe, expect, it } from "vitest";
import { suggestProducts } from "./suggestProducts";
import { CATALOG_SNAPSHOT } from "@/lib/catalogSnapshot";

describe("suggestProducts", () => {
  it("não sugere nada com texto muito curto", () => {
    expect(suggestProducts("c", CATALOG_SNAPSHOT)).toHaveLength(0);
    expect(suggestProducts("", CATALOG_SNAPSHOT)).toHaveLength(0);
  });

  it("sugere produtos cujo nome contém alguma palavra do texto digitado", () => {
    const results = suggestProducts("calça hell", CATALOG_SNAPSHOT);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.name === "Calça Oversized - Hell Hounds Drop")).toBe(true);
  });

  it("prioriza produto cujo nome contém o texto inteiro", () => {
    const results = suggestProducts("moletom zip up com touca", CATALOG_SNAPSHOT);
    expect(results[0]?.name).toBe("Moletom Zip Up Com Touca - MM Basic Drop");
  });

  it("não sugere produto inativo", () => {
    const inactiveCatalog = CATALOG_SNAPSHOT.map((p) =>
      p.name.includes("Hell Hounds") ? { ...p, active: false } : p,
    );
    const results = suggestProducts("calça hell hounds", inactiveCatalog);
    expect(results.some((p) => p.name.includes("Hell Hounds"))).toBe(false);
  });
});
