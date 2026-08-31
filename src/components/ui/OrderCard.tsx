import { Link } from "react-router-dom";
import type { OrderSummary } from "@/lib/supabase/queries";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency } from "@/lib/formatting/mask";

interface OrderCardProps extends OrderSummary {
  onRemove?: (order: OrderSummary["order"]) => void;
  removeLabel?: string;
}

export function OrderCard({ order, itemsSummary, onRemove, removeLabel = "Remover" }: OrderCardProps) {
  const isCreated = order.status === "created";

  return (
    <Link
      to={`/pedidos/${order.public_number}`}
      className="block rounded-md border border-border bg-surface p-5 transition-colors hover:border-text-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-left">
          <p
            className="text-lg text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            #{order.public_number}
          </p>
          <p className="mt-1 text-sm font-medium text-text">{order.customer_name}</p>
          <p className="mt-0.5 text-sm text-text-muted">{itemsSummary}</p>
        </div>
        <div className="text-right">
          <p
            className="text-base text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatCurrency(order.total_amount)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col items-start gap-1.5">
        <StatusBadge tone={isCreated ? "success" : "danger"}>
          {isCreated ? "Pedido criado" : "Não criado"}
        </StatusBadge>
        {!isCreated && order.failure_reason && (
          <p className="text-xs text-text-muted">{order.failure_reason}</p>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onRemove(order);
          }}
          className="mt-3 text-xs text-text-muted hover:text-danger"
        >
          {removeLabel}
        </button>
      )}
    </Link>
  );
}
