import { ReviewField } from "./ReviewField";
import { ProductQueryField } from "./ProductQueryField";
import type { FieldStatus, OrderSource, ReviewForm } from "./reviewTypes";
import { matchCatalogItem } from "@/lib/catalog/matchProduct";
import { onlyDigits } from "@/lib/parser/normalizers";
import type { CatalogSnapshotProduct } from "@/lib/catalogSnapshot";

const SOURCE_LABELS: Record<OrderSource, string> = {
  whatsapp: "WhatsApp",
  discord: "Discord",
  instagram: "Instagram",
};

interface OrderReviewFieldsProps {
  form: ReviewForm;
  statuses: Record<string, FieldStatus>;
  catalog: CatalogSnapshotProduct[] | undefined;
  updateField: <K extends keyof ReviewForm>(key: K, value: ReviewForm[K]) => void;
}

/**
 * Bloco de campos de revisão (origem, cliente, contato, endereço, produtos,
 * mensagem original) — compartilhado entre Novo Pedido e Editar Pedido, que
 * só diferem em como chegam aos dados iniciais e no que fazem ao confirmar.
 */
export function OrderReviewFields({ form, statuses, catalog, updateField }: OrderReviewFieldsProps) {
  return (
    <>
      <section className="rounded-md border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-text">Origem</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="field-origem" className="mb-1.5 block text-sm text-text-muted">
              Canal
            </label>
            <select
              id="field-origem"
              value={form.source}
              onChange={(e) => updateField("source", e.target.value as OrderSource)}
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text focus-visible:border-text"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="discord">Discord</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
          {form.source === "whatsapp" ? (
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">
                Últimos 4 dígitos do telefone
              </label>
              <div className="w-full rounded-md border border-border bg-bg px-4 py-3 text-sm text-text-muted">
                {onlyDigits(form.phone).slice(-4) || "— preencha o telefone —"}
              </div>
            </div>
          ) : (
            <ReviewField
              label={`Usuário do ${SOURCE_LABELS[form.source]}`}
              value={form.sourceUsername}
              status={form.sourceUsername.trim() ? "recognized" : "missing"}
              onChange={(v) => updateField("sourceUsername", v)}
            />
          )}
          <div>
            <label htmlFor="field-cupom" className="mb-1.5 block text-sm text-text-muted">
              Cupom utilizado (opcional)
            </label>
            <input
              id="field-cupom"
              type="text"
              value={form.couponCode}
              onChange={(e) => updateField("couponCode", e.target.value.toUpperCase())}
              placeholder="Ex.: DARK"
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-disabled focus-visible:border-text"
            />
          </div>
        </div>
      </section>

      <section className="rounded-md border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-text">Cliente</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReviewField
            label="Nome completo"
            value={form.customerName}
            status={statuses.customerName ?? "missing"}
            onChange={(v) => updateField("customerName", v)}
          />
          <ReviewField
            label="CPF"
            value={form.cpf}
            status={statuses.cpf ?? "missing"}
            onChange={(v) => updateField("cpf", v)}
            errorMessage="CPF inválido."
          />
        </div>
      </section>

      <section className="rounded-md border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-text">Contato</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReviewField
            label="Telefone"
            value={form.phone}
            status={statuses.phone ?? "missing"}
            onChange={(v) => updateField("phone", v)}
            errorMessage="Telefone inválido."
          />
          <ReviewField
            label="E-mail"
            value={form.email}
            status={statuses.email ?? "missing"}
            onChange={(v) => updateField("email", v)}
            errorMessage="E-mail inválido."
          />
        </div>
      </section>

      <section className="rounded-md border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-text">Endereço</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReviewField
            label="CEP"
            value={form.cep}
            status={statuses.cep ?? "missing"}
            onChange={(v) => updateField("cep", v)}
            errorMessage="CEP não encontrado."
          />
          <ReviewField
            label="Estado"
            value={form.state}
            status={statuses.state ?? "missing"}
            onChange={(v) => updateField("state", v)}
          />
          <ReviewField
            label="Endereço"
            value={form.street}
            status={statuses.street ?? "missing"}
            onChange={(v) => updateField("street", v)}
          />
          <ReviewField
            label="Número"
            value={form.number}
            status={statuses.number ?? "missing"}
            onChange={(v) => updateField("number", v)}
            errorMessage="Número do endereço não informado."
          />
          <ReviewField
            label="Bairro"
            value={form.district}
            status={statuses.district ?? "missing"}
            onChange={(v) => updateField("district", v)}
          />
          <ReviewField
            label="Cidade"
            value={form.city}
            status={statuses.city ?? "missing"}
            onChange={(v) => updateField("city", v)}
          />
          <ReviewField
            label="Complemento"
            value={form.complement}
            status="recognized"
            onChange={(v) => updateField("complement", v)}
          />
        </div>
      </section>

      <section className="rounded-md border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-text">Produtos</h2>
        {form.items.length === 0 ? (
          <p className="text-sm text-text-muted">
            Nenhum item reconhecido — adicione manualmente antes de continuar.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {form.items.map((item, index) => {
              const match = matchCatalogItem(item.productQuery, item.size, catalog ?? []);
              return (
                <div key={item.id} className="rounded-md border border-border p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <ProductQueryField
                      value={item.productQuery}
                      status="ambiguous"
                      catalog={catalog}
                      onChange={(v) => {
                        const items = [...form.items];
                        items[index] = { ...item, productQuery: v };
                        updateField("items", items);
                      }}
                    />
                    <ReviewField
                      label="Tamanho"
                      value={item.size}
                      status={item.size ? "recognized" : "missing"}
                      onChange={(v) => {
                        const items = [...form.items];
                        items[index] = { ...item, size: v };
                        updateField("items", items);
                      }}
                    />
                    <ReviewField
                      label="Quantidade"
                      value={String(item.quantity)}
                      status="recognized"
                      type="number"
                      onChange={(v) => {
                        const items = [...form.items];
                        items[index] = { ...item, quantity: Number(v) || 1 };
                        updateField("items", items);
                      }}
                    />
                    <ReviewField
                      label="Preço unitário"
                      value={item.unitPrice ? String(item.unitPrice) : ""}
                      status={item.unitPrice > 0 ? "recognized" : "missing"}
                      type="number"
                      onChange={(v) => {
                        const items = [...form.items];
                        items[index] = { ...item, unitPrice: Number(v) || 0 };
                        updateField("items", items);
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    {match
                      ? `Casado com: ${match.product.name} (${match.variantKey})`
                      : "Sem correspondência no catálogo ainda — o pedido será marcado como não criado se continuar assim."}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {form.originalMessage && (
        <section className="rounded-md border border-border bg-surface p-6 text-left">
          <h2 className="mb-2 text-base font-semibold text-text">Mensagem original</h2>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm text-text-muted">
            {form.originalMessage}
          </pre>
        </section>
      )}
    </>
  );
}
