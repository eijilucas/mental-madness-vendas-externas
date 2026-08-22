import { isValidCep, isValidCpf, isValidEmail, isValidPhone, normalizeSize, normalizeUf, onlyDigits } from "./normalizers";

export type FieldConfidence = "alta" | "media" | "baixa";

export interface ParsedField<T = string> {
  value: T;
  confidence: FieldConfidence;
  valid: boolean;
}

export interface ParsedItemGuess {
  rawText: string;
  productQuery: string;
  size: string | null;
  quantity: number;
}

export interface ParsedMessage {
  customerName: ParsedField | null;
  cpf: ParsedField | null;
  cep: ParsedField | null;
  street: ParsedField | null;
  district: ParsedField | null;
  number: ParsedField | null;
  complement: ParsedField | null;
  city: ParsedField | null;
  state: ParsedField | null;
  email: ParsedField | null;
  phone: ParsedField | null;
  items: ParsedItemGuess[];
}

// Rótulos aceitos, conforme §9.2 do briefing (formas reais, com acento).
const LABELS: Record<string, string[]> = {
  items: ["Peças, cores e tamanhos", "Peças", "Produtos", "Itens"],
  customerName: ["Nome e Sobrenome", "Nome", "Destinatário"],
  cep: ["CEP"],
  cpf: ["CPF"],
  street: ["Endereço", "Rua", "Logradouro"],
  district: ["Bairro"],
  number: ["Número da casa", "Número", "Nº"],
  complement: ["Complemento", "Referência"],
  city: ["Cidade"],
  state: ["Estado", "UF"],
  email: ["E-mail", "Email"],
  phone: ["Número de telefone", "Telefone", "WhatsApp"],
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function escapeAndFlex(label: string): string {
  return label
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "[\\s,]*");
}

function buildLabelPattern(): RegExp {
  const allLabels = Object.values(LABELS).flat().sort((a, b) => b.length - a.length);
  const alternatives = allLabels.map(escapeAndFlex);
  return new RegExp(`(${alternatives.join("|")})\\s*[:\\-]\\s*`, "gi");
}

function fieldKeyForLabel(label: string): string | null {
  const normalized = stripAccents(label.trim().toLowerCase());
  for (const [key, aliases] of Object.entries(LABELS)) {
    if (aliases.some((alias) => stripAccents(alias.toLowerCase()) === normalized)) return key;
  }
  return null;
}

/** Divide a mensagem em pares rótulo→valor, funcionando tanto para linhas separadas quanto para tudo em uma única linha. */
function extractLabeledValues(message: string): Record<string, string> {
  const pattern = buildLabelPattern();
  const matches = [...message.matchAll(pattern)];
  const result: Record<string, string> = {};

  if (matches.length === 0) return result;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const key = fieldKeyForLabel(match[1]);
    if (!key) continue;
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? message.length : message.length;
    const value = message.slice(start, end).trim().replace(/[,;]+$/, "").trim();
    if (value) result[key] = value;
  }

  return result;
}

function cleanMessage(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/\\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function field(value: string | null, confidence: FieldConfidence, valid: boolean): ParsedField | null {
  if (value === null || value.trim() === "") return null;
  return { value: value.trim(), confidence, valid };
}

export function parseWhatsappMessage(rawMessage: string): ParsedMessage {
  const message = cleanMessage(rawMessage);
  const labeled = extractLabeledValues(message);

  // Fallbacks por formato, usados quando o rótulo não foi reconhecido.
  const cpfFallback = message.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/)?.[0] ?? null;
  const cepFallback = message.match(/\d{5}-?\d{3}/)?.[0] ?? null;
  const emailFallback = message.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0] ?? null;
  const phoneFallback =
    message.match(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/)?.[0] ?? null;

  const cpfValue = labeled.cpf ?? cpfFallback;
  const cepValue = labeled.cep ?? cepFallback;
  const emailValue = labeled.email ?? emailFallback;
  const phoneValue = labeled.phone ?? phoneFallback;
  const stateValue = labeled.state ? normalizeUf(labeled.state) : null;

  const parsed: ParsedMessage = {
    customerName: field(labeled.customerName ?? null, labeled.customerName ? "alta" : "baixa", !!labeled.customerName),
    cpf: field(cpfValue, labeled.cpf ? "alta" : "media", cpfValue ? isValidCpf(cpfValue) : false),
    cep: field(cepValue, labeled.cep ? "alta" : "media", cepValue ? isValidCep(cepValue) : false),
    street: field(labeled.street ?? null, "alta", !!labeled.street),
    district: field(labeled.district ?? null, "alta", !!labeled.district),
    number: field(labeled.number ?? null, "alta", !!labeled.number),
    complement: field(labeled.complement ?? null, "alta", true),
    city: field(labeled.city ?? null, "alta", !!labeled.city),
    state: field(stateValue, labeled.state ? "alta" : "baixa", !!stateValue),
    email: field(emailValue, labeled.email ? "alta" : "media", emailValue ? isValidEmail(emailValue) : false),
    phone: field(phoneValue, labeled.phone ? "alta" : "media", phoneValue ? isValidPhone(phoneValue) : false),
    items: labeled.items ? parseItems(labeled.items) : [],
  };

  // CPF/CEP/telefone vindos de fallback (sem rótulo) mas inválidos no formato
  // esperado ficam marcados como baixa confiança para forçar revisão humana.
  if (parsed.cpf && !labeled.cpf && !parsed.cpf.valid) parsed.cpf.confidence = "baixa";
  if (parsed.cep && !labeled.cep && !parsed.cep.valid) parsed.cep.confidence = "baixa";
  if (parsed.phone && !labeled.phone && !parsed.phone.valid) parsed.phone.confidence = "baixa";

  return parsed;
}

const SIZE_TOKEN = /\b(pp|p|m|g|gg|xg|pequeno|medio|médio|grande)\b/i;

function parseItems(itemsText: string): ParsedItemGuess[] {
  const chunks = itemsText
    .split(/,|\n|(?:\s+e\s+)/i)
    .map((c) => c.trim())
    .filter(Boolean);

  return chunks.map((chunk) => {
    const sizeMatch = chunk.match(new RegExp(`tamanho\\s+(${SIZE_TOKEN.source})|${SIZE_TOKEN.source}$`, "i"));
    const size = sizeMatch ? normalizeSize(sizeMatch[1] ?? sizeMatch[2] ?? "") : null;
    const productQuery = chunk
      .replace(/tamanho\s+\w+/i, "")
      .replace(SIZE_TOKEN, "")
      .trim();

    return {
      rawText: chunk,
      productQuery: productQuery || chunk,
      size,
      quantity: 1,
    };
  });
}

export { onlyDigits };
