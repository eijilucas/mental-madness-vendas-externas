import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCreateOrderGroup, useOrderGroups } from "@/lib/supabase/queries";

export function GroupsPage() {
  const { data: groups, isLoading, isError, refetch } = useOrderGroups();
  const createGroup = useCreateOrderGroup();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await createGroup.mutateAsync(trimmed);
    setName("");
    setCreating(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Drops"
        description="Agrupe pedidos de um mesmo drop exclusivo para navegar juntos."
        actions={
          !creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg"
            >
              Novo drop
            </button>
          )
        }
      />

      {creating && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5 sm:flex-row sm:items-center"
        >
          <label className="flex-1">
            <span className="sr-only">Nome do drop</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Hell Hounds"
              className="w-full rounded-md border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-text-disabled focus-visible:border-text"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!name.trim() || createGroup.isPending}
              className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg disabled:opacity-50"
            >
              {createGroup.isPending ? "Criando…" : "Criar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setName("");
              }}
              className="rounded-md border border-border px-5 py-3 text-sm text-text-muted hover:text-text"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <LoadingState label="Carregando drops…" />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar os drops." onRetry={() => refetch()} />
      ) : !groups || groups.length === 0 ? (
        <EmptyState
          title="Nenhum drop criado ainda"
          description='Clique em "Novo drop" para agrupar os pedidos de um drop exclusivo, ex.: Hell Hounds.'
        />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(({ group, orderCount }) => (
            <Link
              key={group.id}
              to={`/drops/${group.id}`}
              className="flex items-center justify-between rounded-md border border-border bg-surface p-5 hover:border-text"
            >
              <span className="text-base font-medium text-text">{group.name}</span>
              <span className="text-sm text-text-muted">
                {orderCount === 1 ? "1 pedido" : `${orderCount} pedidos`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
