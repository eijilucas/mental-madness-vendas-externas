import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCatalog } from "@/lib/supabase/queries";
import { supabase } from "@/lib/supabase/client";
import type { CatalogSnapshotProduct } from "@/lib/catalogSnapshot";

function matchesSearch(product: CatalogSnapshotProduct, term: string): boolean {
  if (!term) return true;
  const haystack = [
    product.name,
    ...product.variants.flatMap((v) => [v.size, v.color]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(term.toLowerCase());
}

interface DropGroup {
  key: string;
  label: string;
  products: CatalogSnapshotProduct[];
}

// No modelo do estoque, "1 produto exclusivo = 1 drop" (drop.id é sempre
// igual ao product.id) — então agrupar por drop.id só criava um grupo por
// PRODUTO, não por drop de verdade. O nome do drop de fato é a parte depois
// do "-" no título (ex.: "Calça Oversized - Hell Hounds Drop" → "Hell
// Hounds Drop"), mesma extração que o sync do estoque usa pra detectar o
// drop atual (detectCurrentDropKeyword em mapping.js).
function extractDropSuffix(name: string): string {
  // Nomes reais não seguem espaçamento consistente ao redor do "-" (ex.:
  // "Camiseta Oversized-Crimson Veil", "Moletom Oversized- Creature
  // Within") — captura tudo depois do ÚLTIMO "-", com ou sem espaço.
  const match = name.match(/-\s*([^-]+)$/);
  return match ? match[1].trim() : name;
}

function normalizeDropKey(suffix: string): string {
  return suffix.replace(/\bdrop\b/gi, "").trim().toLowerCase();
}

// Separa por drop: básico é um grupo só (venda contínua, sem drop
// específico); exclusivo agrupa pelo nome do drop extraído do título —
// inclusive drops antigos que o Vitor às vezes recoloca à venda (ver
// docs/decisions sobre sync completo).
function groupByDrop(products: CatalogSnapshotProduct[]): DropGroup[] {
  const basico = products.filter((p) => p.type === "basico");
  const exclusivo = products.filter((p) => p.type === "exclusivo");

  const dropsByKey = new Map<string, DropGroup>();
  for (const product of exclusivo) {
    const suffix = extractDropSuffix(product.name);
    const key = normalizeDropKey(suffix);
    const existing = dropsByKey.get(key);
    if (!existing) {
      dropsByKey.set(key, { key, label: suffix, products: [product] });
    } else {
      existing.products.push(product);
      // prefere o rótulo mais curto ("Hell Hounds" em vez de "Hell Hounds
      // Drop") — normalmente só um produto da família carrega o "Drop".
      if (suffix.length < existing.label.length) existing.label = suffix;
    }
  }

  const groups: DropGroup[] = [];
  if (basico.length > 0) groups.push({ key: "basico", label: "Básico", products: basico });
  groups.push(...dropsByKey.values());
  return groups;
}

export function CatalogPage() {
  const [search, setSearch] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(
    null,
  );
  const { data: catalog, isLoading, isFetching, isError, refetch } = useCatalog();

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("trigger-catalog-sync", {
        method: "POST",
      });
      if (error || !data?.ok) {
        setSyncMessage({ tone: "danger", text: "Não foi possível sincronizar com o Shopify agora." });
      } else {
        setSyncMessage({
          tone: "success",
          text: `Sincronizado: ${data.productsCount} produtos, ${data.variantsCount} variantes.`,
        });
        await refetch();
      }
    } catch {
      setSyncMessage({ tone: "danger", text: "Não foi possível sincronizar com o Shopify agora." });
    } finally {
      setSyncing(false);
    }
  }

  const filtered = useMemo(
    () => (catalog ?? []).filter((product) => matchesSearch(product, search)),
    [catalog, search],
  );
  const groups = useMemo(() => groupByDrop(filtered), [filtered]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo e aliases"
        description="Consulta somente leitura do catálogo sincronizado do estoque."
        actions={
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || isFetching}
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-text hover:border-text disabled:opacity-60"
          >
            {syncing && (
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-text"
                aria-hidden="true"
              />
            )}
            {syncing ? "Sincronizando com a Shopify…" : "Solicitar sincronização"}
          </button>
        }
      />

      {syncMessage && (
        <p className={`text-xs ${syncMessage.tone === "success" ? "text-success" : "text-danger"}`}>
          {syncMessage.text}
        </p>
      )}

      {catalog && (
        <p className="text-xs text-text-muted">{catalog.length} produtos sincronizados</p>
      )}

      <div className="sm:max-w-xs">
        <SearchField value={search} onChange={setSearch} placeholder="Produto, tamanho ou cor" />
      </div>

      {isLoading ? (
        <LoadingState label="Carregando catálogo…" />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar o catálogo." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhum produto encontrado" />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((groupItem) => {
            const isOpen = openGroup === groupItem.key;
            return (
              <div key={groupItem.key} className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : groupItem.key)}
                  className="flex items-center justify-between rounded-md border border-border bg-surface p-5 hover:border-text"
                >
                  <span className="text-base font-medium text-text">{groupItem.label}</span>
                  <span className="text-sm text-text-muted">
                    {groupItem.products.length === 1
                      ? "1 produto"
                      : `${groupItem.products.length} produtos`}
                  </span>
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-3 pl-4">
                    {groupItem.products.map((product) => (
                      <details
                        key={product.id}
                        className="group rounded-md border border-border bg-surface p-4 open:pb-2"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                          <div className="text-left">
                            <p className="font-medium text-text">{product.name}</p>
                            <p className="text-sm text-text-muted">
                              {product.type === "exclusivo" ? "Drop exclusivo" : "Básico"}
                              {" · "}
                              {product.variants.length} variante(s)
                            </p>
                          </div>
                          <StatusBadge tone={product.active ? "success" : "neutral"}>
                            {product.active ? "Ativo" : "Inativo"}
                          </StatusBadge>
                        </summary>

                        <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
                          {product.variants.map((variant) => (
                            <div
                              key={variant.variantKey}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-text">
                                {variant.size}
                                {variant.color ? ` · ${variant.color}` : ""}
                              </span>
                              <span className="text-text-muted">
                                estoque real: {variant.estoqueReal}
                              </span>
                            </div>
                          ))}
                          {product.type === "exclusivo" && (
                            <p className="mt-2 text-xs text-text-muted">
                              Drop exclusivo: produção sob demanda — estoque real 0 é esperado até
                              que pedidos gerem produção.
                            </p>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
