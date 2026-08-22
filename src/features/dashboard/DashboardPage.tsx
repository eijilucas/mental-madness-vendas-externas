import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useOrders } from "@/lib/supabase/queries";

function isToday(isoDate: string): boolean {
  const d = new Date(isoDate);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function DashboardPage() {
  const { data: orders, isLoading, isError, refetch } = useOrders();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Visão geral" />
        <LoadingState label="Carregando…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Visão geral" />
        <ErrorState message="Não foi possível carregar os pedidos." onRetry={() => refetch()} />
      </div>
    );
  }

  const all = orders ?? [];
  const today = all.filter((o) => isToday(o.order.created_at));
  const created = today.filter((o) => o.order.status === "created").length;
  const notCreated = today.filter((o) => o.order.status === "not_created").length;
  const recent = all.slice(0, 3);

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
        <MetricCard label="Pedidos hoje" value={today.length} />
        <MetricCard
          label="Pedidos criados"
          value={created}
          hint={today.length > 0 ? `${Math.round((created / today.length) * 100)}% do total recebido` : undefined}
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
        {recent.length === 0 && (
          <p className="text-sm text-text-muted">Nenhum pedido registrado ainda.</p>
        )}
        <div className="flex flex-col gap-3">
          {recent.map(({ order, itemsSummary }) => (
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
