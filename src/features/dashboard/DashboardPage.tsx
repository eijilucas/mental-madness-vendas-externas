import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { MOCK_ORDERS } from "@/lib/mockData";

export function DashboardPage() {
  const today = MOCK_ORDERS; // mock: todos "hoje" para demonstração
  const created = today.filter((o) => o.order.status === "created").length;
  const notCreated = today.filter((o) => o.order.status === "not_created").length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Visão geral"
        description="Acompanhe a entrada e o resultado final das vendas externas."
        actions={
          <Link
            to="/novo-pedido"
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg"
          >
            Novo pedido
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Pedidos hoje" value={today.length} hint="+3 em relação a ontem" />
        <MetricCard
          label="Pedidos criados"
          value={created}
          hint={`${Math.round((created / today.length) * 100)}% do total recebido`}
        />
        <MetricCard
          label="Não criados"
          value={notCreated}
          hint="Requerem correção manual"
        />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Pedidos recentes</h2>
          <Link to="/pedidos" className="text-sm text-text-muted hover:text-text">
            Ver todos
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {today.slice(0, 3).map(({ order, itemsSummary }) => (
            <Link
              key={order.id}
              to={`/pedidos/${order.public_number}`}
              className="flex items-center justify-between rounded-md border border-border bg-surface p-4 hover:border-text-muted"
            >
              <div className="text-left">
                <span
                  className="text-text"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  #{order.public_number}
                </span>
                <span className="ml-3 text-sm text-text-muted">
                  {order.customer_name}
                </span>
                <span className="ml-3 text-sm text-text-muted">{itemsSummary}</span>
              </div>
              <span
                className="text-text"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {order.total_amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-text">Fluxo direto</h2>
        <p className="mt-1 text-sm text-text-muted">
          Cole a mensagem do WhatsApp, confira os dados interpretados e crie o pedido.
        </p>
        <div className="mt-4 flex flex-col gap-2 text-sm text-text-muted sm:flex-row sm:items-center sm:gap-4">
          <span>Colar mensagem</span>
          <span aria-hidden="true">→</span>
          <span>Revisar dados</span>
          <span aria-hidden="true">→</span>
          <span>Criar pedido</span>
        </div>
        <Link
          to="/novo-pedido"
          className="mt-5 inline-block rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg"
        >
          Iniciar pedido
        </Link>
      </section>
    </div>
  );
}
