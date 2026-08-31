import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { parseWhatsappMessage, type ParsedField } from "@/lib/parser/parseWhatsappMessage";
import { normalizeUf, onlyDigits } from "@/lib/parser/normalizers";
import { OrderReviewFields } from "./OrderReviewFields";
import { validateReviewForm } from "./validateReviewForm";
import type { FieldStatus, ReviewForm, ReviewItem } from "./reviewTypes";
import { useCatalog, useOrderGroup } from "@/lib/supabase/queries";
import { matchCatalogItem } from "@/lib/catalog/matchProduct";
import { supabase } from "@/lib/supabase/client";

type Step = "paste" | "review" | "result";
type ConfirmResult =
  | { ok: true; orderNumber: number; couponWarning?: string }
  | { ok: false; reason: string };

function emptyForm(originalMessage: string): ReviewForm {
  return {
    customerName: "",
    cpf: "",
    phone: "",
    email: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    state: "",
    items: [],
    originalMessage,
    source: "whatsapp",
    sourceUsername: "",
    couponCode: "",
  };
}

function fieldToStatus(field: ParsedField | null): FieldStatus {
  if (!field) return "missing";
  if (!field.valid) return field.confidence === "baixa" ? "ambiguous" : "invalid";
  return "recognized";
}

export function NewOrderPage() {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("drop");
  const { data: group } = useOrderGroup(groupId ?? undefined);

  const [step, setStep] = useState<Step>("paste");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<ReviewForm>(emptyForm(""));
  const [statuses, setStatuses] = useState<Record<string, FieldStatus>>({});
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data: catalog } = useCatalog();

  // Pré-preenche o preço quando o item casa com um produto que já tem
  // price sincronizado da Shopify (ver docs/decisions/004) — só quando
  // ainda está zerado, pra nunca sobrescrever um valor que o operador já
  // editou na mão.
  useEffect(() => {
    if (!catalog || form.items.length === 0) return;
    let changed = false;
    const items = form.items.map((item) => {
      if (item.unitPrice > 0) return item;
      const match = matchCatalogItem(item.productQuery, item.size, catalog);
      const price = match?.product.variants.find((v) => v.variantKey === match.variantKey)?.price;
      if (!price) return item;
      changed = true;
      return { ...item, unitPrice: price };
    });
    if (changed) setForm((prev) => ({ ...prev, items }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, form.items]);

  function handleInterpret() {
    const parsed = parseWhatsappMessage(message);

    const nextForm: ReviewForm = {
      customerName: parsed.customerName?.value ?? "",
      cpf: parsed.cpf?.value ?? "",
      phone: parsed.phone?.value ?? "",
      email: parsed.email?.value ?? "",
      cep: parsed.cep?.value ?? "",
      street: parsed.street?.value ?? "",
      number: parsed.number?.value ?? "",
      complement: parsed.complement?.value ?? "",
      district: parsed.district?.value ?? "",
      city: parsed.city?.value ?? "",
      state: parsed.state?.value ?? "",
      items: parsed.items.map(
        (item, index): ReviewItem => ({
          id: `item-${index}`,
          rawText: item.rawText,
          productQuery: item.productQuery,
          size: item.size ?? "",
          quantity: item.quantity,
          unitPrice: 0,
          variantMatched: false,
        }),
      ),
      originalMessage: message,
      source: "whatsapp",
      sourceUsername: "",
      couponCode: "",
    };

    setForm(nextForm);
    setStatuses({
      customerName: fieldToStatus(parsed.customerName),
      cpf: fieldToStatus(parsed.cpf),
      phone: fieldToStatus(parsed.phone),
      email: parsed.email ? fieldToStatus(parsed.email) : "missing",
      cep: fieldToStatus(parsed.cep),
      street: fieldToStatus(parsed.street),
      number: fieldToStatus(parsed.number),
      district: fieldToStatus(parsed.district),
      city: fieldToStatus(parsed.city),
      state: fieldToStatus(parsed.state),
    });
    setStep("review");
  }

  function handleClear() {
    setMessage("");
    setForm(emptyForm(""));
    setStatuses({});
    setStep("paste");
  }

  function updateField<K extends keyof ReviewForm>(key: K, value: ReviewForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatuses((prev) => ({ ...prev, [key]: "corrected" }));
  }

  const validation = useMemo(() => validateReviewForm(form), [form]);

  async function handleConfirm() {
    if (validation.length > 0 || submitting) return;
    setSubmitting(true);

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
      idempotency_key: crypto.randomUUID(),
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

    const { data, error } = await supabase.rpc("create_external_order", { payload });

    setSubmitting(false);

    if (error) {
      setResult({ ok: false, reason: "Falha técnica ao criar o pedido. Tente novamente." });
      setStep("result");
      return;
    }

    if (data.status !== "created") {
      setResult({ ok: false, reason: data.failure_reason ?? "Pedido não criado." });
      setStep("result");
      return;
    }

    if (groupId) {
      await supabase.rpc("set_order_group", { p_order_id: data.order_id, p_group_id: groupId });
    }

    let couponWarning: string | undefined;
    if (form.couponCode.trim()) {
      try {
        const { data: couponResult, error: couponError } = await supabase.functions.invoke(
          "register-coupon-sale",
          { body: { order_id: data.order_id, coupon_code: form.couponCode.trim() } },
        );
        if (couponError || couponResult?.status === "error") {
          couponWarning = "Não deu pra registrar o cupom agora — confira depois no pedido.";
        } else if (couponResult?.status === "not_found") {
          couponWarning =
            "Cupom não encontrado — confira se está digitado corretamente ou contate o TI.";
        }
      } catch {
        couponWarning = "Não deu pra registrar o cupom agora — confira depois no pedido.";
      }
    }

    setResult({ ok: true, orderNumber: data.public_number, couponWarning });
    setStep("result");
  }

  if (step === "result" && result) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Resultado" />
        {result.ok ? (
          <div className="rounded-md border border-success/40 bg-surface p-8 text-left">
            <p className="text-sm font-semibold uppercase tracking-wide text-success">
              Pedido criado
            </p>
            <p className="mt-2 text-text">
              #{result.orderNumber} foi criado e seguirá o fluxo operacional.
            </p>
            {result.couponWarning && (
              <p className="mt-2 text-sm text-warning">{result.couponWarning}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/pedidos/${result.orderNumber}`}
                className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg"
              >
                Ver pedido
              </Link>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md border border-border px-5 py-3 text-sm text-text hover:border-text"
              >
                Registrar outro pedido
              </button>
              {groupId && (
                <Link
                  to={`/drops/${groupId}`}
                  className="rounded-md border border-border px-5 py-3 text-sm text-text hover:border-text"
                >
                  Voltar ao drop
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-danger/40 bg-surface p-8 text-left">
            <p className="text-sm font-semibold uppercase tracking-wide text-danger">
              Pedido não criado
            </p>
            <p className="mt-2 text-text">{result.reason}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep("review")}
                className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg"
              >
                Revisar dados
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      <PageHeader
        title="Novo pedido"
        description={
          group
            ? `Transforme uma mensagem do WhatsApp em um pedido revisado. Será adicionado ao drop "${group.name}".`
            : "Transforme uma mensagem do WhatsApp em um pedido revisado."
        }
      />

      <div className="flex gap-2 text-xs uppercase tracking-wide text-text-muted">
        <span className={step === "paste" ? "text-text" : ""}>1. Colar mensagem</span>
        <span aria-hidden="true">→</span>
        <span className={step === "review" ? "text-text" : ""}>2. Revisar dados</span>
        <span aria-hidden="true">→</span>
        <span>3. Criar pedido</span>
      </div>

      {step === "paste" && (
        <section className="rounded-md border border-border bg-surface p-6">
          <h2 className="mb-1 text-base font-semibold text-text">Mensagem original</h2>
          <p className="mb-4 text-sm text-text-muted">
            Cole aqui o conteúdo recebido pelo WhatsApp.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={12}
            className="w-full resize-y rounded-md border border-border bg-bg p-4 text-left text-sm text-text placeholder:text-text-disabled focus-visible:border-text"
            placeholder={"Peças, cores e tamanhos: ...\nNome e Sobrenome: ...\nCEP: ..."}
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleInterpret}
              disabled={!message.trim()}
              className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg disabled:opacity-50"
            >
              Interpretar mensagem
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-border px-5 py-3 text-sm text-text hover:border-text"
            >
              Limpar
            </button>
          </div>
        </section>
      )}

      {step === "review" && (
        <>
          <OrderReviewFields form={form} statuses={statuses} catalog={catalog} updateField={updateField} />

          {validation.length > 0 && (
            <section className="rounded-md border border-warning/40 bg-surface p-5 text-left">
              <p className="mb-2 text-sm font-medium text-warning">
                Corrija antes de continuar:
              </p>
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
              onClick={handleConfirm}
              disabled={validation.length > 0 || submitting}
              className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-bg disabled:opacity-50"
            >
              {submitting ? "Criando…" : "Criar pedido"}
            </button>
            <button
              type="button"
              onClick={() => setStep("paste")}
              className="rounded-md border border-border px-6 py-3 text-sm text-text hover:border-text"
            >
              Voltar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
