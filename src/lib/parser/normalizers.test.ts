import { describe, expect, it } from "vitest";
import { isValidCep, isValidCpf, isValidEmail, isValidPhone, normalizePhone, normalizeSize, normalizeUf } from "./normalizers";

describe("isValidCpf", () => {
  it("aceita CPF válido com ou sem formatação", () => {
    expect(isValidCpf("111.444.777-35")).toBe(true);
    expect(isValidCpf("11144477735")).toBe(true);
  });

  it("rejeita CPF com dígito verificador incorreto", () => {
    expect(isValidCpf("111.444.777-36")).toBe(false);
  });

  it("rejeita sequência de dígitos repetidos", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });

  it("rejeita tamanho incorreto", () => {
    expect(isValidCpf("123")).toBe(false);
  });
});

describe("isValidCep", () => {
  it("aceita CEP com 8 dígitos, com ou sem hífen", () => {
    expect(isValidCep("14169-310")).toBe(true);
    expect(isValidCep("14169310")).toBe(true);
  });

  it("rejeita CEP com tamanho errado", () => {
    expect(isValidCep("1234")).toBe(false);
  });
});

describe("normalizeUf", () => {
  it("aceita sigla direta em qualquer caixa", () => {
    expect(normalizeUf("sp")).toBe("SP");
    expect(normalizeUf("SP")).toBe("SP");
  });

  it("converte nome completo do estado para sigla", () => {
    expect(normalizeUf("São Paulo")).toBe("SP");
    expect(normalizeUf("rio de janeiro")).toBe("RJ");
  });

  it("retorna null para estado inválido", () => {
    expect(normalizeUf("Nárnia")).toBeNull();
  });
});

describe("isValidEmail / isValidPhone / normalizePhone", () => {
  it("valida e-mails simples", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("invalido")).toBe(false);
  });

  it("valida telefone com DDD e 8 ou 9 dígitos", () => {
    expect(isValidPhone("16996169828")).toBe(true);
    expect(isValidPhone("1633334444")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
  });

  it("normaliza telefone adicionando DDI 55", () => {
    expect(normalizePhone("16996169828")).toBe("5516996169828");
    expect(normalizePhone("5516996169828")).toBe("5516996169828");
  });
});

describe("normalizeSize", () => {
  it("normaliza tamanhos por alias", () => {
    expect(normalizeSize("m")).toBe("M");
    expect(normalizeSize("grande")).toBe("G");
    expect(normalizeSize("médio")).toBe("M");
  });
});
