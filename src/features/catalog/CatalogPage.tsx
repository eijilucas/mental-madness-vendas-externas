import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

interface MockVariant {
  id: string;
  productTitle: string;
  sku: string;
  size: string;
  color: string;
  active: boolean;
}

const MOCK_VARIANTS: MockVariant[] = [
  { id: "1", productTitle: "Calça Hell Hounds", sku: "CAL-HH-M-PT", size: "M", color: "Preto", active: true },
  { id: "2", productTitle: "Calça Drop Hells", sku: "CAL-DH-M", size: "M", color: "Preto", active: true },
  { id: "3", productTitle: "Moletom Dark Moon", sku: "MOL-DM-P", size: "P", color: "Preto", active: true },
  { id: "4", productTitle: "Camiseta Basics", sku: "CAM-BAS-G", size: "G", color: "Branco", active: false },
];

export function CatalogPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_VARIANTS.filter((v) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      v.productTitle.toLowerCase().includes(term) ||
      v.sku.toLowerCase().includes(term)
    );
  });

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

      <p className="text-xs text-text-muted">Última sincronização: há 12 minutos</p>

      <div className="sm:max-w-xs">
        <SearchField value={search} onChange={setSearch} placeholder="Produto, SKU, tamanho ou cor" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma variante encontrada" />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-md border border-border bg-surface p-4"
            >
              <div className="text-left">
                <p className="font-medium text-text">{v.productTitle}</p>
                <p className="text-sm text-text-muted">
                  {v.sku} · {v.size} · {v.color}
                </p>
              </div>
              <StatusBadge tone={v.active ? "success" : "neutral"}>
                {v.active ? "Ativa" : "Inativa"}
              </StatusBadge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
