import { describe, expect, it } from "vitest";
import { parseWhatsappMessage } from "./parseWhatsappMessage";

// Fixtures anonimizadas — mesma estrutura das mensagens reais do briefing,
// com dados pessoais substituídos por valores fictícios.
const MULTILINE_LABELED = `Peças, cores e tamanhos: Calça Hell Hounds tamanho M
Nome e Sobrenome: Fulano de Tal
CEP: 14169310
Endereço: Rua Exemplo
Bairro: Jardim Exemplo
Número da casa: 100
Cidade: Cidade Exemplo
Estado: SP
E-mail: fulano@example.com
CPF: 111.444.777-35
Número de telefone: 16999998888`;

const SINGLE_LINE_LABELED =
  "Peças, cores e tamanhos: Calça Hell Hounds tamanho M, Nome e Sobrenome: Fulano de Tal, CEP: 14169310, Endereço: Rua Exemplo, Bairro: Jardim Exemplo, Número da casa: 100, Cidade: Cidade Exemplo, Estado: SP, E-mail: fulano@example.com, CPF: 111.444.777-35, Número de telefone: 16999998888";

const NO_LABELS_FREEFORM = `Fulano de Tal
Rua Exemplo, 100, Jardim Exemplo, Cidade Exemplo SP
14169-310
111.444.777-35
(16) 99999-8888
fulano@example.com
Calça Hell Hounds M`;

describe("parseWhatsappMessage", () => {
  it("interpreta mensagem multi-linha com rótulos com alta confiança", () => {
    const result = parseWhatsappMessage(MULTILINE_LABELED);

    expect(result.customerName?.value).toBe("Fulano de Tal");
    expect(result.customerName?.confidence).toBe("alta");
    expect(result.cpf?.value).toBe("111.444.777-35");
    expect(result.cpf?.valid).toBe(true);
    expect(result.cep?.value).toBe("14169310");
    expect(result.cep?.valid).toBe(true);
    expect(result.city?.value).toBe("Cidade Exemplo");
    expect(result.state?.value).toBe("SP");
    expect(result.email?.valid).toBe(true);
    expect(result.phone?.valid).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].size).toBe("M");
    expect(result.items[0].productQuery).toMatch(/Hell Hounds/i);
  });

  it("interpreta a mesma mensagem em uma única linha", () => {
    const result = parseWhatsappMessage(SINGLE_LINE_LABELED);

    expect(result.customerName?.value).toBe("Fulano de Tal");
    expect(result.cpf?.value).toBe("111.444.777-35");
    expect(result.cep?.value).toBe("14169310");
    expect(result.state?.value).toBe("SP");
  });

  it("usa reconhecedores de fallback quando não há rótulos, com confiança reduzida", () => {
    const result = parseWhatsappMessage(NO_LABELS_FREEFORM);

    expect(result.cpf?.value.replace(/\D/g, "")).toBe("11144477735");
    expect(result.cpf?.confidence).toBe("media");
    expect(result.cep?.value.replace(/\D/g, "")).toBe("14169310");
    expect(result.email?.valid).toBe(true);
    expect(result.phone?.valid).toBe(true);
    // sem rótulo "Nome e Sobrenome", o parser não deve inventar um nome
    expect(result.customerName).toBeNull();
  });

  it("marca CPF fora do formato esperado como baixa confiança para revisão", () => {
    const result = parseWhatsappMessage("CPF: 123.456.789-00\nNome e Sobrenome: Ciclano");
    expect(result.cpf?.valid).toBe(false);
  });

  it("separa múltiplos produtos na mesma mensagem", () => {
    const result = parseWhatsappMessage(
      "Peças, cores e tamanhos: Calça Hell Hounds tamanho M, Camiseta Basics tamanho G\nNome e Sobrenome: Fulano",
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[0].size).toBe("M");
    expect(result.items[1].size).toBe("G");
  });
});
