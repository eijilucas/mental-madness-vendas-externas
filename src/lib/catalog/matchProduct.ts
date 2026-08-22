import type { CatalogSnapshotProduct } from "@/lib/catalogSnapshot";

function stripAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const STOPWORDS = new Set(["a", "o", "de", "da", "do", "e", "com", "para", "tamanho"]);

function significantWords(text: string): string[] {
  return stripAccents(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// Mesma lista de tipos de peça usada no parser (parseWhatsappMessage.ts) —
// já normalizada sem acento, já que compara contra significantWords().
const GARMENT_TYPES = [
  "calca", "camiseta", "moletom", "jaqueta", "bone", "vestido",
  "shorts", "regata", "casaco", "blusa",
];

function garmentType(words: string[]): string | null {
  return words.find((w) => GARMENT_TYPES.includes(w)) ?? null;
}

export interface MatchResult {
  product: CatalogSnapshotProduct;
  variantKey: string;
}

/**
 * Casamento simples por palavras em comum entre o texto digitado pelo
 * cliente e o nome real do produto — versão mínima até existir a UI de
 * sugestões com múltiplas opções (§7 do briefing).
 *
 * Bug real encontrado em produção: dentro do mesmo drop, vários produtos
 * compartilham as mesmas palavras do nome do drop (ex.: "Hell Hounds"
 * aparece em calça, camiseta E moletom) — um casamento só por contagem de
 * palavras em comum casava "casaco Hell Hounds" com a CALÇA do drop, só
 * porque "hell"+"hounds" batiam. Por isso, quando o texto do cliente
 * menciona um tipo de peça (calça/camiseta/moletom/...), o produto
 * candidato PRECISA ser do mesmo tipo — nunca casa peça diferente só
 * porque o nome do drop bate.
 */
export function matchCatalogItem(
  productQuery: string,
  size: string,
  products: CatalogSnapshotProduct[],
): MatchResult | null {
  const queryWordsList = significantWords(productQuery);
  const queryWords = new Set(queryWordsList);
  if (queryWords.size === 0) return null;

  const queryType = garmentType(queryWordsList);

  let best: { product: CatalogSnapshotProduct; score: number } | null = null;

  for (const product of products) {
    if (!product.active) continue;
    const nameWords = significantWords(product.name);

    if (queryType) {
      // Cliente mencionou um tipo de peça: só considera produtos desse
      // mesmo tipo, mesmo que outras palavras (nome do drop) batam.
      const nameType = garmentType(nameWords);
      if (nameType !== queryType) continue;
    }

    const overlap = nameWords.filter((w) => queryWords.has(w)).length;
    const required = Math.min(2, nameWords.length);
    if (overlap < required) continue;
    if (!best || overlap > best.score) {
      best = { product, score: overlap };
    }
  }

  if (!best) return null;

  const normalizedSize = size.trim().toUpperCase();
  const variant = best.product.variants.find((v) => v.size === normalizedSize);
  if (!variant) return null;

  return { product: best.product, variantKey: variant.variantKey };
}
