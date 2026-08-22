import { Link, useNavigate } from "react-router-dom";
import type { OrderSummary } from "@/lib/supabase/queries";
import { StatusBadge } from "./StatusBadge";
import { OrderCard } from "./OrderCard";
import { formatCurrency } from "@/lib/formatting/mask";

interface OrderTableProps {
  orders: OrderSummary[];
}

export function OrderTable({ orders }: OrderTableProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Desktop: tabela real. Mobile: cards — nunca uma tabela comprimida. */}
      <div className="hidden overflow-x-auto rounded-md border border-border sm:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-xs uppercase tracking-wide text-text-muted">
              <th className="px-5 py-3 font-medium">Pedido</th>
              <th className="px-5 py-3 font-medium">Cliente / Itens</th>
              <th className="px-5 py-3 font-medium">Valor</th>
              <th className="px-5 py-3 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(({ order, itemsSummary }) => (
              <tr
                key={order.id}
                onClick={() => navigate(`/pedidos/${order.public_number}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface"
              >
                <td className="px-5 py-4">
                  <Link
                    to={`/pedidos/${order.public_number}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-text hover:underline"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    #{order.public_number}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-text">{order.customer_name}</p>
                  <p className="text-text-muted">{itemsSummary}</p>
                </td>
                <td
                  className="px-5 py-4 text-text"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {formatCurrency(order.total_amount)}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge tone={order.status === "created" ? "success" : "danger"}>
                      {order.status === "created" ? "Pedido criado" : "Não criado"}
                    </StatusBadge>
                    {order.status === "not_created" && order.failure_reason && (
                      <span className="text-xs text-text-muted">
                        {order.failure_reason}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {orders.map((item) => (
          <OrderCard key={item.order.id} {...item} />
        ))}
      </div>
    </>
  );
}
