import { describe, expect, it } from "vitest";
import { parseWhatsappMessage } from "./parseWhatsappMessage";
import { isValidCpf } from "./normalizers";
import { CATALOG_SNAPSHOT } from "@/lib/catalogSnapshot";

/**
 * Gera muitos clientes/pedidos sintéticos (nome, CPF válido, telefone,
 * e-mail, endereço e produto real do catálogo) e verifica que o parser
 * reconhece cada campo corretamente — não só os poucos exemplos fixos.
 * PRNG com seed fixa: determinístico, sem flakiness.
 */

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function randomDigits(rng: () => number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(rng() * 10);
  return out;
}

function calcCpfDigit(base: string): number {
  let sum = 0;
  let weight = base.length + 1;
  for (const char of base) {
    sum += Number(char) * weight;
    weight -= 1;
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

function randomValidCpf(rng: () => number): string {
  let base: string;
  do {
    base = randomDigits(rng, 9);
  } while (/^(\d)\1{8}$/.test(base)); // evita gerar sequência tipo 999999999
  const d1 = calcCpfDigit(base);
  const d2 = calcCpfDigit(base + d1);
  return `${base}${d1}${d2}`;
}

const DDDS = ["11", "16", "21", "31", "41", "51", "61", "71", "81", "85", "88"];

function randomPhone(rng: () => number): string {
  const ddd = pick(rng, DDDS);
  return `${ddd}9${randomDigits(rng, 8)}`;
}

const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Diego", "Elaine", "Fábio", "Gabriela", "Heitor",
  "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olivia",
  "Pedro", "Raquel", "Samuel", "Tatiane", "Vinícius",
];
const LAST_NAMES = [
  "Almeida", "Barbosa", "Costa", "Dias", "Ferreira", "Gomes", "Henrique",
  "Lima", "Martins", "Nascimento", "Oliveira", "Pereira", "Ribeiro",
  "Santos", "Souza", "Teixeira",
];

function randomName(rng: () => number): string {
  return `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
}

const STREETS = ["Rua das Acácias", "Avenida Brasil", "Rua Sete de Setembro", "Alameda Santos", "Travessa da Paz"];
const DISTRICTS = ["Centro", "Jardim Europa", "Vila Nova", "Bela Vista", "Boa Vista"];
const CITY_STATE_PAIRS: Array<[string, string]> = [
  ["São Paulo", "SP"],
  ["Rio de Janeiro", "RJ"],
  ["Belo Horizonte", "MG"],
  ["Salvador", "BA"],
  ["Curitiba", "PR"],
  ["Fortaleza", "CE"],
  ["Recife", "PE"],
  ["Porto Alegre", "RS"],
];

function buildMessage(rng: () => number) {
  const name = randomName(rng);
  const cpf = randomValidCpf(rng);
  const cpfFormatted = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  const phone = randomPhone(rng);
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
  const cep = randomDigits(rng, 8);
  const street = pick(rng, STREETS);
  const district = pick(rng, DISTRICTS);
  const number = String(Math.floor(rng() * 3000) + 1);
  const [city, state] = pick(rng, CITY_STATE_PAIRS);

  const product = pick(rng, CATALOG_SNAPSHOT);
  const variant = pick(rng, product.variants);

  const message = `Peças, cores e tamanhos: ${product.name} tamanho ${variant.size}
Nome e Sobrenome: ${name}
CEP: ${cep}
Endereço: ${street}
Bairro: ${district}
Número da casa: ${number}
Cidade: ${city}
Estado: ${state}
E-mail: ${email}
CPF: ${cpfFormatted}
Número de telefone: ${phone}`;

  return { message, expected: { name, cpf, phone, email, cep, street, district, number, city, state, product, variant } };
}

describe("parser — clientes e pedidos aleatórios (fuzz determinístico)", () => {
  const rng = mulberry32(42);
  const cases = Array.from({ length: 50 }, () => buildMessage(rng));

  it.each(cases.map((c, i) => ({ ...c, i })))(
    "caso aleatório #$i reconhece todos os campos corretamente",
    ({ message, expected }) => {
      const result = parseWhatsappMessage(message);

      expect(result.customerName?.value).toBe(expected.name);
      expect(result.customerName?.confidence).toBe("alta");

      expect(result.cpf?.valid).toBe(true);
      expect(isValidCpf(expected.cpf)).toBe(true); // valida o próprio gerador
      expect(result.cpf?.value.replace(/\D/g, "")).toBe(expected.cpf);

      expect(result.cep?.value).toBe(expected.cep);
      expect(result.cep?.valid).toBe(true);

      expect(result.street?.value).toBe(expected.street);
      expect(result.district?.value).toBe(expected.district);
      expect(result.number?.value).toBe(expected.number);
      expect(result.city?.value).toBe(expected.city);
      expect(result.state?.value).toBe(expected.state);

      expect(result.email?.value).toBe(expected.email);
      expect(result.email?.valid).toBe(true);

      expect(result.phone?.valid).toBe(true);
      expect(result.phone?.value.replace(/\D/g, "")).toBe(expected.phone);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].size).toBe(expected.variant.size);
      expect(result.items[0].productQuery).toContain(expected.product.name);
    },
  );
});
