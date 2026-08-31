import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OrderTable } from "@/components/ui/OrderTable";
import { formatCurrency } from "@/lib/formatting/mask";
import {
  useDeleteOrderGroup,
  useOrderGroup,
  useOrdersByGroup,
  useRenameOrderGroup,
  useSetOrderGroup,
  useUngroupedOrders,
} from "@/lib/supabase/queries";

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const { data: group, isLoading: loadingGroup, isError: errorGroup } = useOrderGroup(groupId);
  const {
    data: orders,
    isLoading: loadingOrders,
    isError: errorOrders,
    refetch: refetchOrders,
  } = useOrdersByGroup(groupId);

  const renameGroup = useRenameOrderGroup();
  const deleteGroup = useDeleteOrderGroup();
  const setOrderGroup = useSetOrderGroup();

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [addingOrders, setAddingOrders] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: ungrouped } = useUngroupedOrders();

  const filteredUngrouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (ungrouped ?? []).filter(({ order }) => {
      if (!term) return true;
      return (
        order.customer_name.toLowerCase().includes(term) ||
        String(order.public_number).includes(term)
      );
    });
  }, [ungrouped, search]);

  if (loadingGroup) return <LoadingState label="Carregando drop…" />;
  if (errorGroup || !group) {
    return (
      <ErrorState message="Drop não encontrado." onRetry={() => navigate("/drops")} />
    );
  }

  async function handleDelete() {
    if (!groupId) return;
    await deleteGroup.mutateAsync(groupId);
    navigate("/drops");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={group.name}
        description="Pedidos deste drop agrupados manualmente — organização e visualização, sem ação em lote."
        actions={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setNameDraft(group.name);
                setRenaming(true);
              }}
              className="rounded-md border border-border px-4 py-3 text-sm text-text hover:border-text"
            >
              Renomear
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-md border border-danger/40 px-4 py-3 text-sm text-danger hover:border-danger"
            >
              Apagar drop
            </button>
          </div>
        }
      />

      {renaming && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!groupId || !nameDraft.trim()) return;
            await renameGroup.mutateAsync({ groupId, name: nameDraft.trim() });
            setRenaming(false);
          }}
          className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5 sm:flex-row sm:items-center"
        >
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            className="flex-1 rounded-md border border-border bg-bg px-4 py-3 text-sm text-text"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setRenaming(false)}
              className="rounded-md border border-border px-5 py-3 text-sm text-text-muted hover:text-text"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">
          Pedidos do drop {orders ? `(${orders.length})` : ""}
        </h2>
        <div className="flex gap-3">
          {!addingOrders && (
            <button
              type="button"
              onClick={() => setAddingOrders(true)}
              className="rounded-md border border-border px-4 py-2.5 text-sm text-text hover:border-text"
            >
              Adicionar pedidos existentes
            </button>
          )}
          <Link
            to={`/novo-pedido?drop=${groupId}`}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-bg"
          >
            Novo pedido neste drop
          </Link>
        </div>
      </div>

      {addingOrders && (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="max-w-xs flex-1">
              <SearchField value={search} onChange={setSearch} placeholder="Nome ou número do pedido" />
            </div>
            <button
              type="button"
              onClick={() => setAddingOrders(false)}
              className="text-sm text-text-muted hover:text-text"
            >
              Fechar
            </button>
          </div>

          {filteredUngrouped.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nenhum pedido sem drop encontrado.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredUngrouped.map(({ order, itemsSummary }) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-text">
                      #{order.public_number} · {order.customer_name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {itemsSummary} · {formatCurrency(order.total_amount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={setOrderGroup.isPending}
                    onClick={() =>
                      groupId && setOrderGroup.mutate({ orderId: order.id, groupId })
                    }
                    className="shrink-0 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-bg disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loadingOrders ? (
        <LoadingState label="Carregando pedidos do drop…" />
      ) : errorOrders ? (
        <ErrorState message="Não foi possível carregar os pedidos." onRetry={() => refetchOrders()} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          title="Nenhum pedido nesse drop ainda"
          description='Use "Adicionar pedidos" para escolher quais pedidos entram aqui.'
        />
      ) : (
        <OrderTable
          orders={orders}
          removeLabel="Remover do drop"
          onRemove={(order) => setOrderGroup.mutate({ orderId: order.id, groupId: null })}
        />
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Apagar drop"
        message={`Apagar o drop "${group.name}"? Os pedidos não serão apagados, só deixam de pertencer a ele.`}
        confirmLabel="Apagar"
        danger
        pending={deleteGroup.isPending}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
