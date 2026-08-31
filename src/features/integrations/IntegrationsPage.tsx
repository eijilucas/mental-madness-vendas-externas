import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useIntegrationEvents, useRetryCouponSale, useRetryShipping } from "@/lib/supabase/queries";
import type { Order } from "@/types/database";

interface IntegrationRow {
  key: string;
  destination: string;
  order: Order;
  tone: "success" | "danger" | "warning";
  label: string;
  detail?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}

export function IntegrationsPage() {
  const { data: orders, isLoading, isError, refetch } = useIntegrationEvents();
  const retryShipping = useRetryShipping();
  const retryCoupon = useRetryCouponSale();

  const rows: IntegrationRow[] = [];
  for (const order of orders ?? []) {
    if (order.coupon_code) {
      const tone =
        order.coupon_sale_status === "registered"
          ? "success"
          : order.coupon_sale_status === "not_found"
            ? "warning"
            : "danger";
      const label =
        order.coupon_sale_status === "registered"
          ? "Registrado"
          : order.coupon_sale_status === "not_found"
            ? "Cupom não encontrado"
            : "Falhou";
      rows.push({
        key: `coupon-${order.id}`,
        destination: "Comissionamento",
        order,
        tone,
        label,
        detail: `Cupom ${order.coupon_code}`,
        onRetry: order.coupon_sale_status !== "registered" ? () => retryCoupon.mutate({ orderId: order.id, couponCode: order.coupon_code! }) : undefined,
        retrying: retryCoupon.isPending,
      });
    }

    // Todo pedido criado tenta entrar na fila de envio, então mostra sempre
    // — inclusive "pending" (nunca tentou de verdade, ex.: falhou antes de
    // chegar a chamar a function), pra ficar visível que falta reprocessar.
    {
      const tone = order.shipping_status === "sent" ? "success" : order.shipping_status === "failed" ? "danger" : "warning";
      const label =
        order.shipping_status === "sent" ? "Enviado" : order.shipping_status === "failed" ? "Falhou" : "Pendente";
      rows.push({
        key: `shipping-${order.id}`,
        destination: "Etiquetas (fila de envio)",
        order,
        tone,
        label,
        detail: order.shipping_last_error,
        onRetry: order.shipping_status !== "sent" ? () => retryShipping.mutate(order.id) : undefined,
        retrying: retryShipping.isPending,
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Central de integrações"
        description="Saúde da entrega dos pedidos ao comissionamento e à fila de envio (etiquetas)."
      />

      {isLoading ? (
        <LoadingState label="Carregando integrações…" />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar as integrações." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhuma integração pendente" description="Nenhum pedido com cupom ou fila de envio a mostrar ainda." />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-left">
                <p className="font-medium text-text">
                  {row.destination} ·{" "}
                  <Link to={`/pedidos/${row.order.public_number}`} className="hover:underline">
                    Pedido #{row.order.public_number}
                  </Link>
                </p>
                <p className="text-sm text-text-muted">
                  {row.order.customer_name}
                  {row.detail ? ` · ${row.detail}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge tone={row.tone}>{row.label}</StatusBadge>
                {row.onRetry && (
                  <button
                    type="button"
                    onClick={row.onRetry}
                    disabled={row.retrying}
                    className="rounded-md border border-border px-3 py-2 text-sm text-text hover:border-text disabled:opacity-50"
                  >
                    {row.retrying ? "Reprocessando…" : "Reprocessar"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
