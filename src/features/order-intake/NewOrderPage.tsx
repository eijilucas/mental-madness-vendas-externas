import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { parseWhatsappMessage, type ParsedField } from "@/lib/parser/parseWhatsappMessage";
import { isValidCep, isValidCpf, isValidEmail, isValidPhone, normalizeUf } from "@/lib/parser/normalizers";
import { ReviewField } from "./ReviewField";
import type { FieldStatus, ReviewForm, ReviewItem } from "./reviewTypes";

type Step = "paste" | "review" | "result";
type ConfirmResult = { ok: true; orderNumber: number } | { ok: false; reason: string };

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
  };
}

function fieldToStatus(field: ParsedField | null): FieldStatus {
  if (!field) return "missing";
  if (!field.valid) return field.confidence === "baixa" ? "ambiguous" : "invalid";
  return "recognized";
}

export function NewOrderPage() {
  const [step, setStep] = useState<Step>("paste");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<ReviewForm>(emptyForm(""));
  const [statuses, setStatuses] = useState<Record<string, FieldStatus>>({});
  const [result, setResult] = useState<ConfirmResult | null>(null);

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

  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!form.customerName.trim()) errors.push("Nome do cliente é obrigatório.");
    if (!isValidCpf(form.cpf)) errors.push("CPF inválido.");
    if (!isValidCep(form.cep)) errors.push("CEP não encontrado.");
    if (!form.street.trim()) errors.push("Endereço é obrigatório.");
    if (!form.number.trim()) errors.push("Número do endereço não informado.");
    if (!form.district.trim()) errors.push("Bairro é obrigatório.");
    if (!form.city.trim()) errors.push("Cidade é obrigatória.");
    if (!normalizeUf(form.state)) errors.push("Selecione um estado válido.");
    if (!isValidPhone(form.phone)) errors.push("Telefone inválido.");
    if (form.email && !isValidEmail(form.email)) errors.push("E-mail inválido.");
    if (form.items.length === 0) errors.push("Adicione ao menos um item.");
    form.items.forEach((item, i) => {
      if (!item.size) errors.push(`Item ${i + 1}: selecione uma variante válida.`);
    });
    return errors;
  }, [form]);

  function handleConfirm() {
    if (validation.length > 0) return;
    // Mock local — a criação real (idempotente, via Edge Function + outbox)
    // entra na fase de integração; aqui só simula o resultado final exibido.
    const orderNumber = 1049;
    setResult({ ok: true, orderNumber });
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
        description="Transforme uma mensagem do WhatsApp em um pedido revisado."
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
                {form.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 gap-3 rounded-md border border-border p-4 sm:grid-cols-3"
                  >
                    <ReviewField
                      label="Produto (texto original)"
                      value={item.productQuery}
                      status="ambiguous"
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
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-text-muted">
              A correspondência com variantes oficiais do catálogo será exigida antes da
              criação (fase seguinte da implementação).
            </p>
          </section>

          <section className="rounded-md border border-border bg-surface p-6 text-left">
            <h2 className="mb-2 text-base font-semibold text-text">Mensagem original</h2>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm text-text-muted">
              {form.originalMessage}
            </pre>
          </section>

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
              disabled={validation.length > 0}
              className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-bg disabled:opacity-50"
            >
              Criar pedido
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
