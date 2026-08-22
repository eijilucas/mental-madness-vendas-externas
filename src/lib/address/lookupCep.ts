import { isValidCep, onlyDigits } from "@/lib/parser/normalizers";

export type CepSource = "viacep" | "brasilapi" | "none";

export interface CepLookupResult {
  found: boolean;
  source: CepSource;
  street: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  ibgeCode: string | null;
}

const NOT_FOUND_RESULT: CepLookupResult = {
  found: false,
  source: "none",
  street: null,
  district: null,
  city: null,
  state: null,
  ibgeCode: null,
};

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

interface ViaCepResponse {
  erro?: string | boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
}

async function fetchViaCep(cep: string, timeoutMs: number): Promise<CepLookupResult | null> {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });
    if (!response.ok) return null;

    const data = (await response.json()) as ViaCepResponse;
    // ViaCEP responde 200 com {"erro":"true"} para CEP bem formatado mas
    // inexistente — não é um booleano de verdade, checar como string também.
    if (data.erro === true || data.erro === "true") return null;

    return {
      found: true,
      source: "viacep",
      street: data.logradouro || null,
      district: data.bairro || null,
      city: data.localidade || null,
      state: data.uf || null,
      ibgeCode: data.ibge || null,
    };
  } catch {
    return null;
  } finally {
    cancel();
  }
}

interface BrasilApiResponse {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  ibge?: { city?: string };
}

async function fetchBrasilApi(cep: string, timeoutMs: number): Promise<CepLookupResult | null> {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { signal });
    if (!response.ok) return null;

    const data = (await response.json()) as BrasilApiResponse;
    return {
      found: true,
      source: "brasilapi",
      street: data.street || null,
      district: data.neighborhood || null,
      city: data.city || null,
      state: data.state || null,
      ibgeCode: data.ibge?.city || null,
    };
  } catch {
    return null;
  } finally {
    cancel();
  }
}

/**
 * Consulta CEP via ViaCEP, com fallback para BrasilAPI (§8 do briefing).
 * Nunca lança — indisponibilidade de um serviço ou do outro só faz o
 * resultado voltar `found: false`, permitindo preenchimento manual sem
 * bloquear o pedido.
 */
export async function lookupCep(cepInput: string, timeoutMs = 5000): Promise<CepLookupResult> {
  const cep = onlyDigits(cepInput);
  if (!isValidCep(cep)) return NOT_FOUND_RESULT;

  const viaCep = await fetchViaCep(cep, timeoutMs);
  if (viaCep) return viaCep;

  const brasilApi = await fetchBrasilApi(cep, timeoutMs);
  if (brasilApi) return brasilApi;

  return NOT_FOUND_RESULT;
}
