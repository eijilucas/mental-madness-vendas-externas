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

export interface MatchResult {
  product: CatalogSnapshotProduct;
  variantKey: string;
}

/**
 * Casamento simples por palavras em comum entre o texto digitado pelo
 * cliente e o nome real do produto — versão mínima até existir a UI de
 * sugestões com múltiplas opções (§7 do briefing). Nunca inventa um match:
 * exige ao menos 2 palavras relevantes em comum (ou 1, se o produto só
 * tiver uma palavra significativa) e a variante do tamanho pedido tem que
 * existir de verdade nesse produto.
 */
export function matchCatalogItem(
  productQuery: string,
  size: string,
  products: CatalogSnapshotProduct[],
): MatchResult | null {
  const queryWords = new Set(significantWords(productQuery));
  if (queryWords.size === 0) return null;

  let best: { product: CatalogSnapshotProduct; score: number } | null = null;

  for (const product of products) {
    if (!product.active) continue;
    const nameWords = significantWords(product.name);
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
