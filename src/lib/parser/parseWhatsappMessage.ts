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

/**
 * Rótulos podem trazer uma observação entre parênteses antes dos dois pontos
 * (ex.: "Complemento (caso tenha):") — tolerada e descartada aqui.
 */
function buildLabelPattern(): RegExp {
  const allLabels = Object.values(LABELS).flat().sort((a, b) => b.length - a.length);
  const alternatives = allLabels.map(escapeAndFlex);
  return new RegExp(`(${alternatives.join("|")})\\s*(?:\\([^)]{0,60}\\))?\\s*[:\\-]\\s*`, "gi");
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

/** Quando "Cidade" vem colada com a UF (ex.: "Sertãozinho SP"), separa as duas partes. */
function splitTrailingUf(cityRaw: string): { city: string; state: string | null } {
  const match = cityRaw.match(/^(.*?)[\s,]+([A-Za-zÀ-ÿ]{2,})$/);
  if (match) {
    const maybeUf = normalizeUf(match[2]);
    if (maybeUf) return { city: match[1].trim(), state: maybeUf };
  }
  return { city: cityRaw, state: null };
}

export function parseWhatsappMessage(rawMessage: string): ParsedMessage {
  const message = cleanMessage(rawMessage);
  const labeled = extractLabeledValues(message);

  // Fallbacks por formato, usados quando o rótulo não foi reconhecido. Usam
  // lookaround para não colidir com um número de telefone/CPF mais longo que
  // contenha, por coincidência, a mesma sequência de dígitos.
  const cpfFallback =
    message.match(/(?<!\d)\d{3}\.?\d{3}\.?\d{3}[.-]?\d{2}(?!\d)/)?.[0] ?? null;
  const cepFallback =
    message.match(/(?<!\d)\d{2}\.?\d{3}-\d{3}(?!\d)|(?<!\d)\d{8}(?!\d)/)?.[0] ?? null;
  const emailFallback = message.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0] ?? null;
  const phoneFallback =
    message.match(/(?<!\d)\(?\d{2}\)?[\s.-]?\d{4,5}-?\d{4}(?!\d)/)?.[0] ?? null;

  const cpfValue = labeled.cpf ?? cpfFallback;
  const cepValue = labeled.cep ?? cepFallback;
  const emailValue = labeled.email ?? emailFallback;
  const phoneValue = labeled.phone ?? phoneFallback;

  const citySplit = labeled.city ? splitTrailingUf(labeled.city) : null;
  const cityValue = citySplit?.city ?? labeled.city ?? null;
  const stateValue = labeled.state ? normalizeUf(labeled.state) : (citySplit?.state ?? null);

  const parsed: ParsedMessage = {
    customerName: field(labeled.customerName ?? null, labeled.customerName ? "alta" : "baixa", !!labeled.customerName),
    cpf: field(cpfValue, labeled.cpf ? "alta" : "media", cpfValue ? isValidCpf(cpfValue) : false),
    cep: field(cepValue, labeled.cep ? "alta" : "media", cepValue ? isValidCep(cepValue) : false),
    street: field(labeled.street ?? null, "alta", !!labeled.street),
    district: field(labeled.district ?? null, "alta", !!labeled.district),
    number: field(labeled.number ?? null, "alta", !!labeled.number),
    complement: field(labeled.complement ?? null, "alta", true),
    city: field(cityValue, "alta", !!cityValue),
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

  // Mensagens sem nenhum rótulo (ou com poucos): completa o que faltar com
  // classificadores por linha (ver §9.1 — "campos sem label").
  applyFreeformLineFallback(message, parsed);

  return parsed;
}

// Ordem importa: alternativas mais longas (ex.: "gg", "pp") precisam vir
// antes de seus prefixos ("g", "p"), senão o regex casa só o prefixo.
const SIZE_WORD = "(pp|gg|xg|p|m|g|pequeno|m[eé]dio|grande)";

/** Extrai um tamanho de um trecho de item, em qualquer um dos formatos observados: "tamanho M", "tamanho (M)", "(M)" ou "M" solto no fim. */
function extractItemSize(text: string): { size: string | null; cleaned: string } {
  let match = text.match(new RegExp(`tamanho\\s*\\(?\\s*${SIZE_WORD}\\s*\\)?`, "i"));
  if (match) {
    return { size: normalizeSize(match[1]), cleaned: text.replace(match[0], "").trim() };
  }

  match = text.match(new RegExp(`\\(\\s*${SIZE_WORD}\\s*\\)`, "i"));
  if (match) {
    return { size: normalizeSize(match[1]), cleaned: text.replace(match[0], "").trim() };
  }

  match = text.match(new RegExp(`\\b${SIZE_WORD}\\b\\s*$`, "i"));
  if (match && match.index !== undefined) {
    return { size: normalizeSize(match[1]), cleaned: text.slice(0, match.index).trim() };
  }

  return { size: null, cleaned: text.trim() };
}

function parseItems(itemsText: string): ParsedItemGuess[] {
  const rawChunks = itemsText
    .split(/,|\n|(?:\s+e\s+)/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const items: ParsedItemGuess[] = [];

  for (const chunk of rawChunks) {
    const { size, cleaned } = extractItemSize(chunk);

    // Um trecho que só continha o tamanho (ex.: "Calça X, tamanho M" vira os
    // chunks ["Calça X", "tamanho M"]) pertence ao item anterior, não é um
    // segundo produto.
    if (!cleaned && items.length > 0) {
      const previous = items[items.length - 1];
      previous.size = previous.size ?? size;
      previous.rawText = `${previous.rawText}, ${chunk}`;
      continue;
    }

    items.push({ rawText: chunk, productQuery: cleaned || chunk, size, quantity: 1 });
  }

  return items;
}

const PRODUCT_KEYWORDS =
  /\b(cal[cç]a|camiseta|moletom|jaqueta|bon[eé]|vestido|shorts|regata|casaco|blusa)\b/i;
const COMPLEMENT_KEYWORDS =
  /\b(port[aã]o|perto|pr[oó]ximo|apto|apartamento|bloco|fundos|esquina|refer[eê]ncia)\b/i;

/**
 * Preenche campos ainda ausentes classificando linha a linha, para mensagens
 * que não usam nenhum rótulo (ou usam poucos). Nunca sobrescreve um valor já
 * reconhecido via rótulo/fallback global — só complementa o que falta, e
 * sempre com confiança "baixa" para forçar revisão humana.
 */
function applyFreeformLineFallback(message: string, parsed: ParsedMessage): void {
  const lines = message
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return;

  function lineMatchesValue(line: string, value?: string | null): boolean {
    if (!value) return false;
    if (line.includes(value)) return true;
    const lineDigits = onlyDigits(line);
    const valueDigits = onlyDigits(value);
    // Exige um mínimo de dígitos para a comparação numérica: sequências
    // curtas (ex.: o "1" de "Rosa Garcia 1") colidiriam com qualquer outro
    // valor que também contenha um único dígito solto, como parte de um
    // e-mail (“Gunnerbr1@...”).
    return valueDigits.length >= 4 && lineDigits === valueDigits;
  }

  const claimed = new Set<number>();
  lines.forEach((line, idx) => {
    const alreadyKnown = [
      parsed.cpf?.value,
      parsed.cep?.value,
      parsed.email?.value,
      parsed.phone?.value,
      parsed.customerName?.value,
      parsed.street?.value,
      parsed.district?.value,
      parsed.number?.value,
      parsed.city?.value,
      parsed.state?.value,
      parsed.complement?.value,
    ];
    if (alreadyKnown.some((value) => lineMatchesValue(line, value))) claimed.add(idx);
    if (parsed.items.some((item) => line.includes(item.rawText))) claimed.add(idx);
  });

  const remaining = () =>
    lines.map((line, idx) => ({ line, idx })).filter(({ idx }) => !claimed.has(idx));

  if (remaining().length === 0) return;

  if (parsed.items.length === 0) {
    const itemLine = remaining().find(
      ({ line }) =>
        PRODUCT_KEYWORDS.test(line) || /tamanho|\(\s*(pp|p|m|g|gg|xg)\s*\)/i.test(line),
    );
    if (itemLine) {
      parsed.items = parseItems(itemLine.line);
      claimed.add(itemLine.idx);
    }
  }

  if (!parsed.customerName) {
    const nameLine = remaining().find(
      ({ line }) =>
        !/\d/.test(line) &&
        line.split(/\s+/).length >= 2 &&
        !PRODUCT_KEYWORDS.test(line) &&
        !COMPLEMENT_KEYWORDS.test(line),
    );
    if (nameLine) {
      parsed.customerName = field(nameLine.line, "baixa", true);
      claimed.add(nameLine.idx);
    }
  }

  if (!parsed.number) {
    const numberLine = remaining().find(({ line }) => /^\d{1,5}$/.test(line));
    if (numberLine) {
      parsed.number = field(numberLine.line, "baixa", true);
      claimed.add(numberLine.idx);
    }
  }

  if (!parsed.complement) {
    const complementLine = remaining().find(({ line }) => COMPLEMENT_KEYWORDS.test(line));
    if (complementLine) {
      parsed.complement = field(complementLine.line, "baixa", true);
      claimed.add(complementLine.idx);
    }
  }

  if (!parsed.state) {
    const stateLine = remaining().find(({ line }) => normalizeUf(line));
    if (stateLine) {
      const uf = normalizeUf(stateLine.line);
      if (uf) {
        parsed.state = field(uf, "baixa", true);
        claimed.add(stateLine.idx);
      }
    }
  }

  // Linhas restantes (sem sinal forte): assume-se a ordem comum
  // endereço → bairro → cidade para as que ainda faltam.
  const addressSlots: Array<"street" | "district" | "city"> = ["street", "district", "city"];
  let slot = 0;
  for (const { line } of remaining()) {
    while (slot < addressSlots.length && parsed[addressSlots[slot]]) slot += 1;
    if (slot >= addressSlots.length) break;
    parsed[addressSlots[slot]] = field(line, "baixa", true);
    slot += 1;
  }
}

export { onlyDigits };
