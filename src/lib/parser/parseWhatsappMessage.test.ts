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
    // sem rótulo "Nome e Sobrenome", o classificador por linha ainda
    // encontra o nome, mas com confiança baixa (exige revisão humana).
    expect(result.customerName?.value).toBe("Fulano de Tal");
    expect(result.customerName?.confidence).toBe("baixa");
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

// Fixtures anonimizadas a partir de 3 mensagens reais enviadas para validação
// (nomes, e-mails, telefones e endereços substituídos; CPF trocado por outro
// com dígito verificador igualmente válido; peculiaridades de digitação
// preservadas — são exatamente o que expôs os bugs originais).
describe("parseWhatsappMessage — casos reais anonimizados", () => {
  it("rótulo com vírgula dentro do próprio texto do item, cidade colada com UF e rótulo de complemento com observação entre parênteses", () => {
    const message = `Peças, cores e tamanhos: Compreensão hell hounds, tamanho M
Nome e Sobrenome:Ciclano da Silva
CEP:14169310
Endereço:Rua das Flores
Bairro:Jardim Alegre
Número da casa:2766
Cidade: Cidade Exemplo SP
Complemento (caso tenha):
Estado:SP
E-mail: ciclano@example.com
CPF: 111.444.777-35
Número de telefone:16999998888`;

    const result = parseWhatsappMessage(message);

    expect(result.customerName?.value).toBe("Ciclano da Silva");
    expect(result.cpf?.valid).toBe(true);
    expect(result.cep?.value).toBe("14169310");
    // "Cidade: ... SP" — a UF colada deve ser separada da cidade.
    expect(result.city?.value).toBe("Cidade Exemplo");
    expect(result.state?.value).toBe("SP");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].size).toBe("M");
    // typo real ("Compreensão" em vez de "Calça") não é corrigido aqui —
    // isso é responsabilidade do casamento com o catálogo, não do parser.
    expect(result.items[0].productQuery).toMatch(/hell hounds/i);
  });

  it("tudo em uma única linha, tamanho entre parênteses, CPF com pontos em vez de traço e UF por extenso", () => {
    const message =
      "Peças, cores e tamanhos:calça hell hounds tamanho (P), calça preta darkmonn bload tamanho GG Nome e Sobrenome:Beltrano Souza CEP:63430000 Endereço:alto joaninha Sobral rua b Bairro:rua b Número da casa:32 Cidade:Cidade Exemplo Complemento (caso tenha):próximo à BR Estado:CEARÁ E-mail:beltrano@example.com CPF: 111.444.777.35 Número de telefone:88999998888";

    const result = parseWhatsappMessage(message);

    expect(result.customerName?.value).toBe("Beltrano Souza");
    expect(result.cpf?.valid).toBe(true);
    expect(result.state?.value).toBe("CE");
    expect(result.complement?.value).toBe("próximo à BR");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].size).toBe("P");
    expect(result.items[0].productQuery).toMatch(/calça hell hounds/i);
    expect(result.items[1].size).toBe("GG");
    expect(result.items[1].productQuery).toMatch(/darkmonn bload/i);
  });

  it("mensagem totalmente sem rótulos, um campo por linha", () => {
    const message = `Calça drop Hells (M)
Ciclano Pereira
18.275-550
Rua das Palmeiras
Setor Central 1
61
Cidade Feliz
Portão preto
Sp
ciclano2@example.com
111.444.777-35
15 999998888`;

    const result = parseWhatsappMessage(message);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].productQuery).toMatch(/drop hells/i);
    expect(result.items[0].size).toBe("M");
    expect(result.customerName?.value).toBe("Ciclano Pereira");
    expect(result.customerName?.confidence).toBe("baixa");
    expect(result.cep?.valid).toBe(true);
    expect(result.street?.value).toBe("Rua das Palmeiras");
    expect(result.district?.value).toBe("Setor Central 1");
    expect(result.number?.value).toBe("61");
    expect(result.city?.value).toBe("Cidade Feliz");
    expect(result.complement?.value).toBe("Portão preto");
    expect(result.state?.value).toBe("SP");
    expect(result.cpf?.valid).toBe(true);
    expect(result.phone?.valid).toBe(true);
  });
});
