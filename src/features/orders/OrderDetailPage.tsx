import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  MOCK_ORDERS,
  MOCK_ORDER_ADDRESSES,
  MOCK_ORDER_ITEMS,
} from "@/lib/mockData";
import { formatCurrency, formatCep, formatPhone, maskCpf } from "@/lib/formatting/mask";

export function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [showOriginal, setShowOriginal] = useState(false);

  const found = MOCK_ORDERS.find(
    ({ order }) => String(order.public_number) === orderNumber,
  );

  if (!found) {
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

  const { order } = found;
  const address = MOCK_ORDER_ADDRESSES[order.id];
  const items = MOCK_ORDER_ITEMS[order.id] ?? [];
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
              <dd className="text-text">{order.cpf ? maskCpf(order.cpf) : "—"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Telefone</dt>
              <dd className="text-text">{order.phone ? formatPhone(order.phone) : "—"}</dd>
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
          <p className="mt-2 text-xs text-text-muted">Origem: WhatsApp</p>
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
