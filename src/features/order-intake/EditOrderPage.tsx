import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderReviewFields } from "./OrderReviewFields";
import { validateReviewForm } from "./validateReviewForm";
import type { FieldStatus, ReviewForm, ReviewItem } from "./reviewTypes";
import { useCatalog, useOrder } from "@/lib/supabase/queries";
import { matchCatalogItem } from "@/lib/catalog/matchProduct";
import { onlyDigits } from "@/lib/parser/normalizers";
import { normalizeUf } from "@/lib/parser/normalizers";
import { supabase } from "@/lib/supabase/client";

function allRecognized(form: ReviewForm): Record<string, FieldStatus> {
  return {
    customerName: "recognized",
    cpf: "recognized",
    phone: "recognized",
    email: form.email ? "recognized" : "missing",
    cep: "recognized",
    street: "recognized",
    number: "recognized",
    district: "recognized",
    city: "recognized",
    state: "recognized",
  };
}

export function EditOrderPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useOrder(orderNumber);
  const { data: catalog } = useCatalog();

  const [form, setForm] = useState<ReviewForm | null>(null);
  const [statuses, setStatuses] = useState<Record<string, FieldStatus>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!data || form) return;
    const { order, address, items } = data;
    const nextForm: ReviewForm = {
      customerName: order.customer_name,
      cpf: order.cpf,
      phone: order.phone,
      email: order.email ?? "",
      cep: address?.cep ?? "",
      street: address?.street ?? "",
      number: address?.number ?? "",
      complement: address?.complement ?? "",
      district: address?.district ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "",
      items: items.map(
        (item, index): ReviewItem => ({
          id: item.id || `item-${index}`,
          rawText: item.product_name,
          productQuery: item.product_name,
          size: item.size ?? "",
          quantity: item.quantity,
          unitPrice: item.unit_price,
          variantMatched: !!item.catalog_product_id,
        }),
      ),
      originalMessage: order.original_message,
      source: order.source === "manual" ? "whatsapp" : order.source,
      sourceUsername: order.source !== "whatsapp" ? order.source_identifier ?? "" : "",
      couponCode: order.coupon_code ?? "",
    };
    setForm(nextForm);
    setStatuses(allRecognized(nextForm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function updateField<K extends keyof ReviewForm>(key: K, value: ReviewForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setStatuses((prev) => ({ ...prev, [key]: "corrected" }));
  }

  const validation = useMemo(() => (form ? validateReviewForm(form) : []), [form]);

  async function handleSave() {
    if (!form || !data || validation.length > 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const catalogProducts = catalog ?? [];
    const items = form.items.map((item) => {
      const match = matchCatalogItem(item.productQuery, item.size, catalogProducts);
      return {
        catalog_product_id: match?.product.id ?? null,
        variant_key: match?.variantKey ?? null,
        product_name: match?.product.name ?? item.productQuery,
        color: null,
        size: item.size,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      };
    });

    const payload = {
      customer: {
        name: form.customerName,
        cpf: onlyDigits(form.cpf),
        email: form.email || null,
        phone: onlyDigits(form.phone),
      },
      address: {
        cep: onlyDigits(form.cep),
        street: form.street,
        number: form.number,
        complement: form.complement || null,
        district: form.district,
        city: form.city,
        state: normalizeUf(form.state),
        ibge_code: null,
        cep_verified: false,
      },
      items,
      original_message: form.originalMessage,
      source: form.source,
      source_identifier:
        form.source === "whatsapp"
          ? onlyDigits(form.phone).slice(-4)
          : form.sourceUsername.trim(),
    };

    const { error } = await supabase.rpc("update_external_order", {
      p_order_id: data.order.id,
      payload,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError("Falha técnica ao salvar as alterações. Tente novamente.");
      return;
    }

    navigate(`/pedidos/${data.order.public_number}`);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Carregando pedido…" />
        <LoadingState />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Pedido" />
        <EmptyState title="Este pedido não existe" description="Confira o número informado." />
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="flex flex-col gap-8 pb-24">
      <PageHeader
        title={`Editar pedido #${data.order.public_number}`}
        description="Altere os dados e salve — o pedido é revalidado como no cadastro."
      />

      <OrderReviewFields form={form} statuses={statuses} catalog={catalog} updateField={updateField} />

      {submitError && <ErrorState message={submitError} />}

      {validation.length > 0 && (
        <section className="rounded-md border border-warning/40 bg-surface p-5 text-left">
          <p className="mb-2 text-sm font-medium text-warning">Corrija antes de salvar:</p>
          <ul className="list-inside list-disc text-sm text-text-muted">
            {validation.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={validation.length > 0 || submitting}
          className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {submitting ? "Salvando…" : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => navigate(`/pedidos/${data.order.public_number}`)}
          className="rounded-md border border-border px-6 py-3 text-sm text-text hover:border-text"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
