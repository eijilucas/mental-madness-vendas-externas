import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

interface MockIntegrationEvent {
  id: string;
  destination: "Estoque" | "Etiquetas";
  orderNumber: number;
  status: "succeeded" | "failed" | "retry_wait";
  attempts: number;
  lastError?: string;
}

const MOCK_EVENTS: MockIntegrationEvent[] = [
  { id: "1", destination: "Estoque", orderNumber: 1048, status: "succeeded", attempts: 1 },
  {
    id: "2",
    destination: "Etiquetas",
    orderNumber: 1047,
    status: "failed",
    attempts: 8,
    lastError: "Produto não encontrado no catálogo.",
  },
];

const statusLabel: Record<MockIntegrationEvent["status"], string> = {
  succeeded: "Concluído",
  failed: "Falhou",
  retry_wait: "Aguardando nova tentativa",
};

const statusTone: Record<MockIntegrationEvent["status"], "success" | "danger" | "warning"> = {
  succeeded: "success",
  failed: "danger",
  retry_wait: "warning",
};

export function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Central de integrações"
        description="Saúde da entrega dos pedidos aos sistemas de estoque e etiquetas."
      />

      {MOCK_EVENTS.length === 0 ? (
        <EmptyState title="Nenhuma integração pendente" />
      ) : (
        <div className="flex flex-col gap-3">
          {MOCK_EVENTS.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-left">
                <p className="font-medium text-text">
                  {event.destination} · Pedido #{event.orderNumber}
                </p>
                <p className="text-sm text-text-muted">
                  {event.attempts} tentativa(s)
                  {event.lastError ? ` · ${event.lastError}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge tone={statusTone[event.status]}>
                  {statusLabel[event.status]}
                </StatusBadge>
                {event.status === "failed" && (
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-2 text-sm text-text hover:border-text"
                  >
                    Reprocessar
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
