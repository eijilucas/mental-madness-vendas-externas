import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CATALOG_SNAPSHOT,
  CATALOG_SNAPSHOT_SYNCED_AT,
  type CatalogSnapshotProduct,
} from "@/lib/catalogSnapshot";

function formatSyncedAt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

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

export function CatalogPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => CATALOG_SNAPSHOT.filter((product) => matchesSearch(product, search)),
    [search],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo e aliases"
        description="Consulta somente leitura do catálogo sincronizado do estoque."
        actions={
          <button
            type="button"
            className="rounded-md border border-border px-4 py-2.5 text-sm text-text hover:border-text"
          >
            Solicitar sincronização
          </button>
        }
      />

      <p className="text-xs text-text-muted">
        Última sincronização: {formatSyncedAt(CATALOG_SNAPSHOT_SYNCED_AT)} · {CATALOG_SNAPSHOT.length} produtos
      </p>

      <div className="sm:max-w-xs">
        <SearchField value={search} onChange={setSearch} placeholder="Produto, tamanho ou cor" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum produto encontrado" />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((product) => (
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
                    Drop exclusivo: produção sob demanda — estoque real 0 é esperado até que
                    pedidos gerem produção.
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
