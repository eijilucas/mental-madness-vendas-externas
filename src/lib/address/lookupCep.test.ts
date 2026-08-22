import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupCep } from "./lookupCep";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("lookupCep", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna não encontrado sem chamar nenhum serviço quando o CEP não tem 8 dígitos", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupCep("123");

    expect(result.found).toBe(false);
    expect(result.source).toBe("none");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("usa o resultado do ViaCEP quando ele responde com endereço válido", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
        ibge: "3550308",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupCep("01310-930");

    expect(result).toEqual({
      found: true,
      source: "viacep",
      street: "Avenida Paulista",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      ibgeCode: "3550308",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("viacep.com.br/ws/01310930/json"),
      expect.anything(),
    );
  });

  it('cai para a BrasilAPI quando o ViaCEP responde {"erro":"true"} (CEP bem formatado mas inexistente)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ erro: "true" }))
      .mockResolvedValueOnce(
        jsonResponse({
          street: "Rua Fallback",
          neighborhood: "Bairro Fallback",
          city: "Cidade Fallback",
          state: "RJ",
          ibge: { city: "3304557" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupCep("99999999");

    expect(result.source).toBe("brasilapi");
    expect(result.street).toBe("Rua Fallback");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("cai para a BrasilAPI quando o ViaCEP está indisponível (erro de rede)", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(
        jsonResponse({
          street: "Rua Fallback",
          neighborhood: null,
          city: "Cidade Fallback",
          state: "SP",
          ibge: { city: "1234567" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupCep("14169310");

    expect(result.found).toBe(true);
    expect(result.source).toBe("brasilapi");
  });

  it("retorna não encontrado (sem lançar) quando os dois serviços falham", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupCep("14169310");

    expect(result.found).toBe(false);
    expect(result.source).toBe("none");
  });

  it("retorna não encontrado quando os dois serviços respondem HTTP não-ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false));
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupCep("14169310");

    expect(result.found).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
