import { useState } from "react";
import type { FieldStatus } from "./reviewTypes";
import { suggestProducts } from "@/lib/catalog/suggestProducts";
import type { CatalogSnapshotProduct } from "@/lib/catalogSnapshot";

const STATUS_LABEL: Record<FieldStatus, string> = {
  recognized: "Reconhecido",
  missing: "Não encontrado",
  invalid: "Inválido",
  ambiguous: "Ambíguo",
  corrected: "Corrigido",
};

const STATUS_TONE: Record<FieldStatus, string> = {
  recognized: "text-success",
  missing: "text-text-muted",
  invalid: "text-danger",
  ambiguous: "text-warning",
  corrected: "text-info",
};

interface ProductQueryFieldProps {
  value: string;
  status: FieldStatus;
  catalog: CatalogSnapshotProduct[] | undefined;
  onChange: (value: string) => void;
}

/**
 * Igual ReviewField, mas com autocomplete de produtos do catálogo real
 * conforme o operador digita — ajuda a acertar o nome exato em vez de
 * depender só do casamento fuzzy em cima de texto livre.
 */
export function ProductQueryField({ value, status, catalog, onChange }: ProductQueryFieldProps) {
  const [open, setOpen] = useState(false);
  const suggestions = open ? suggestProducts(value, catalog ?? []) : [];

  return (
    <div className="relative">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm text-text-muted">Produto (texto original)</label>
        <span className={`text-xs ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay pra permitir o onMouseDown da sugestão disparar antes do
          // blur fechar a lista.
          setTimeout(() => setOpen(false), 150);
        }}
        className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text focus-visible:border-text"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface-raised shadow-lg">
          {suggestions.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(product.name);
                  setOpen(false);
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-text hover:bg-surface"
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
