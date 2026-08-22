export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(cpfDigits: string): boolean {
  const cpf = onlyDigits(cpfDigits);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base: string) => {
    let sum = 0;
    let weight = base.length + 1;
    for (const char of base) {
      sum += Number(char) * weight;
      weight -= 1;
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const digit1 = calcDigit(cpf.slice(0, 9));
  const digit2 = calcDigit(cpf.slice(0, 9) + digit1);
  return cpf.endsWith(`${digit1}${digit2}`);
}

export function isValidCep(cepDigits: string): boolean {
  return onlyDigits(cepDigits).length === 8;
}

const UF_SET = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

const UF_BY_NAME: Record<string, string> = {
  "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM", "bahia": "BA",
  "ceara": "CE", "distrito federal": "DF", "espirito santo": "ES", "goias": "GO",
  "maranhao": "MA", "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
  "para": "PA", "paraiba": "PB", "parana": "PR", "pernambuco": "PE", "piaui": "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS",
  "rondonia": "RO", "roraima": "RR", "santa catarina": "SC", "sao paulo": "SP",
  "sergipe": "SE", "tocantins": "TO",
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizeUf(value: string): string | null {
  const trimmed = value.trim();
  if (UF_SET.has(trimmed.toUpperCase())) return trimmed.toUpperCase();
  const byName = UF_BY_NAME[stripAccents(trimmed).toLowerCase()];
  return byName ?? null;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizePhone(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  return digits;
}

export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value).replace(/^55/, "");
  return digits.length === 10 || digits.length === 11;
}

const SIZE_ALIASES: Record<string, string> = {
  "pp": "PP", "p": "P", "m": "M", "g": "G", "gg": "GG", "xg": "XG",
  "pequeno": "P", "medio": "M", "médio": "M", "grande": "G",
};

export function normalizeSize(value: string): string {
  const key = stripAccents(value.trim().toLowerCase());
  return SIZE_ALIASES[key] ?? value.trim().toUpperCase();
}
