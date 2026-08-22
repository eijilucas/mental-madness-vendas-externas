import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useOrder } from "@/lib/supabase/queries";
import {
  formatCurrency,
  formatCep,
  formatPhone,
  maskCpf,
  maskCpfForList,
  maskPhoneForList,
} from "@/lib/formatting/mask";
import { useAuth } from "@/features/auth/useAuth";

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  discord: "Discord",
  instagram: "Instagram",
  manual: "Manual",
};

export function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [showOriginal, setShowOriginal] = useState(false);
  const { data, isLoading, isError, refetch } = useOrder(orderNumber);
  const { profile } = useAuth();
  // Dado completo (CPF/telefone) só para quem pode agir sobre o pedido —
  // viewer vê mascarado, mesma regra de LGPD já usada nas listagens (§17).
  const canSeeFullPii = profile?.role === "admin" || profile?.role === "operator";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Carregando pedido…" />
        <LoadingState />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Pedido" />
        <ErrorState message="Não foi possível carregar este pedido." onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Pedido não encontrado" />
        <EmptyState
          title="Este pedido não existe"
          description="Confira o número ou volte para a lista de pedidos."
          action={
            <Link to="/pedidos" className="text-sm text-text underline">
              Voltar aos pedidos
            </Link>
          }
        />
      </div>
    );
  }

  const { order, address, items } = data;
  const isCreated = order.status === "created";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Pedido #${order.public_number}`}
        description="Detalhes completos da venda externa."
        actions={
          <StatusBadge tone={isCreated ? "success" : "danger"}>
            {isCreated ? "Pedido criado" : "Pedido não criado"}
          </StatusBadge>
        }
      />

      <Link to="/pedidos" className="text-sm text-text-muted hover:text-text">
        ← Voltar aos pedidos
      </Link>

      {!isCreated && order.failure_reason && (
        <div className="rounded-md border border-danger/40 bg-surface p-5">
          <p className="text-sm font-medium text-danger">
            Motivo: {order.failure_reason}
          </p>
          <Link
            to="/novo-pedido"
            className="mt-3 inline-block rounded-md border border-border px-4 py-2 text-sm text-text hover:border-text"
          >
            Corrigir e tentar novamente
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-border bg-surface p-6">
          <h2 className="mb-4 text-base font-semibold text-text">
            Cliente e entrega
          </h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-text-muted">Nome</dt>
              <dd className="text-text">{order.customer_name}</dd>
            </div>
            <div>
              <dt className="text-text-muted">CPF</dt>
              <dd className="text-text">
                {order.cpf ? (canSeeFullPii ? maskCpf(order.cpf) : maskCpfForList(order.cpf)) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Telefone</dt>
              <dd className="text-text">
                {order.phone
                  ? canSeeFullPii
                    ? formatPhone(order.phone)
                    : maskPhoneForList(order.phone)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">E-mail</dt>
              <dd className="text-text">{order.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Endereço</dt>
              <dd className="text-text">
                {address ? `${address.street}, ${address.number}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Bairro</dt>
              <dd className="text-text">{address?.district || "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Cidade / UF</dt>
              <dd className="text-text">
                {address ? `${address.city}/${address.state}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">CEP</dt>
              <dd className="text-text">
                {address ? formatCep(address.cep) : "—"}
                {address && !address.cep_verified && (
                  <span className="ml-2 text-xs text-warning">CEP não verificado</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-md border border-border bg-surface p-6">
          <h2 className="mb-4 text-base font-semibold text-text">Resumo</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {items.length === 0 && (
              <li className="text-text-muted">Sem itens registrados.</li>
            )}
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span className="text-text">
                  {item.product_name}
                  {item.size ? ` · ${item.size}` : ""}
                  {item.color ? ` · ${item.color}` : ""}
                </span>
                <span className="text-text-muted">
                  {item.quantity}× {formatCurrency(item.unit_price)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-text-muted">Total</span>
            <span
              className="text-lg text-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatCurrency(order.total_amount)}
            </span>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Origem: {SOURCE_LABELS[order.source] ?? order.source}
            {order.source_identifier &&
              ` · ${order.source === "whatsapp" ? "final " : "@"}${order.source_identifier}`}
          </p>
          {order.coupon_code && (
            <p className="mt-1 text-xs text-text-muted">
              Cupom: {order.coupon_code} —{" "}
              {order.coupon_sale_status === "registered" && (
                <span className="text-success">registrado na comissão</span>
              )}
              {order.coupon_sale_status === "not_found" && (
                <span className="text-danger">cupom não encontrado</span>
              )}
              {order.coupon_sale_status === "error" && (
                <span className="text-warning">falha ao registrar, conferir depois</span>
              )}
            </p>
          )}
        </section>
      </div>

      {order.original_message && (
        <section className="rounded-md border border-border bg-surface p-6 text-left">
          <button
            type="button"
            onClick={() => setShowOriginal((v) => !v)}
            className="text-sm font-medium text-text-muted hover:text-text"
          >
            {showOriginal ? "Ocultar mensagem original" : "Ver mensagem original"}
          </button>
          {showOriginal && (
            <pre className="mt-3 whitespace-pre-wrap break-words text-left text-sm text-text-muted">
              {order.original_message}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}
