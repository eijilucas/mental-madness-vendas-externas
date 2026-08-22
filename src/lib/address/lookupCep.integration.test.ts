import { describe, expect, it } from "vitest";
import { lookupCep } from "./lookupCep";

/**
 * Testes de integração de verdade — batem no ViaCEP e na BrasilAPI reais
 * pela rede. Não fazem parte de `npm test` (excluído em vite.config.ts)
 * porque dependem de internet e de serviços de terceiros; rodar com
 * `npm run test:integration`.
 */
describe("lookupCep — integração real (ViaCEP/BrasilAPI)", () => {
  it("resolve um CEP real da Avenida Paulista via ViaCEP", async () => {
    const result = await lookupCep("01310-930");

    expect(result.found).toBe(true);
    expect(result.source).toBe("viacep");
    expect(result.street).toBe("Avenida Paulista");
    expect(result.city).toBe("São Paulo");
    expect(result.state).toBe("SP");
  });

  it("resolve o CEP real usado no exemplo do briefing (Sertãozinho/SP)", async () => {
    const result = await lookupCep("14169310");

    expect(result.found).toBe(true);
    expect(result.city).toBe("Sertãozinho");
    expect(result.state).toBe("SP");
  });

  it("CEP bem formatado mas inexistente não trava — retorna found:false ou usa fallback", async () => {
    // "00000000" não existe em nenhuma base real.
    const result = await lookupCep("00000000");
    expect(result.found).toBe(false);
  });
});
