import { describe, expect, it } from "vitest";
import { maskCpfForList, maskPhoneForList } from "./mask";

describe("maskCpfForList", () => {
  it("mascara o miolo do CPF, mantendo os 3 primeiros e 2 últimos dígitos", () => {
    expect(maskCpfForList("44047241873")).toBe("440.***.***-73");
  });

  it("retorna travessão para CPF com tamanho inválido", () => {
    expect(maskCpfForList("123")).toBe("—");
  });
});

describe("maskPhoneForList", () => {
  it("mascara o miolo de um celular (11 dígitos)", () => {
    expect(maskPhoneForList("16996169828")).toBe("(16) 9****-9828");
  });

  it("mascara o miolo de um fixo (10 dígitos)", () => {
    expect(maskPhoneForList("1633334444")).toBe("(16) ****-4444");
  });

  it("retorna travessão para telefone com tamanho inválido", () => {
    expect(maskPhoneForList("123")).toBe("—");
  });
});
