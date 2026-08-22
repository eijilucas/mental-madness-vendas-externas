import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { OrderTable } from "@/components/ui/OrderTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { MOCK_ORDERS } from "@/lib/mockData";

type StatusFilter = "all" | "created" | "not_created";

export function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    return MOCK_ORDERS.filter(({ order }) => {
      if (status !== "all" && order.status !== status) return false;
      if (!search.trim()) return true;
      const term = search.trim().toLowerCase();
      return (
        order.customer_name.toLowerCase().includes(term) ||
        order.cpf.includes(term) ||
        String(order.public_number).includes(term)
      );
    });
  }, [search, status]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos"
        description="Consulte o histórico das vendas externas e seu resultado final."
        actions={
          <Link
            to="/novo-pedido"
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg"
          >
            Novo pedido
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:max-w-xs sm:flex-1">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Nome, CPF ou número do pedido"
          />
        </div>
        <FilterTabs
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Todos" },
            { value: "created", label: "Criados" },
            { value: "not_created", label: "Não criados" },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum pedido encontrado"
          description="Ajuste a busca ou os filtros."
        />
      ) : (
        <OrderTable orders={filtered} />
      )}
    </div>
  );
}
