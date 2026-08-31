import type { CatalogSnapshotProduct } from "@/lib/catalogSnapshot";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Sugestões de autocomplete pro campo de produto na revisão do pedido —
 * mais permissivo que matchCatalogItem (que decide o casamento final):
 * aqui o objetivo é só ajudar o operador a digitar certo, então basta
 * qualquer palavra do texto aparecer no nome do produto.
 */
export function suggestProducts(
  query: string,
  products: CatalogSnapshotProduct[],
  limit = 6,
): CatalogSnapshotProduct[] {
  const q = normalize(query).trim();
  if (q.length < 2) return [];

  const queryWords = q.split(/\s+/).filter(Boolean);

  const scored = products
    .filter((p) => p.active)
    .map((product) => {
      const name = normalize(product.name);
      const overlap = queryWords.filter((w) => name.includes(w)).length;
      return { product, overlap, includesFull: name.includes(q) };
    })
    .filter((s) => s.overlap > 0)
    .sort((a, b) => {
      if (a.includesFull !== b.includesFull) return a.includesFull ? -1 : 1;
      return b.overlap - a.overlap;
    });

  return scored.slice(0, limit).map((s) => s.product);
}
