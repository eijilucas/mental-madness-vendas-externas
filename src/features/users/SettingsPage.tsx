import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/useAuth";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function SettingsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Configurações"
        description="Perfil, operadores, aliases e regras operacionais."
      />

      <section className="rounded-md border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-text">Perfil</h2>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-text-muted">Nome</dt>
            <dd className="text-text">{profile?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Papel</dt>
            <dd>
              <StatusBadge tone="neutral">{profile?.role ?? "—"}</StatusBadge>
            </dd>
          </div>
        </dl>
      </section>

      {isAdmin && (
        <section className="rounded-md border border-border bg-surface p-6">
          <h2 className="mb-2 text-base font-semibold text-text">
            Operadores e permissões
          </h2>
          <p className="text-sm text-text-muted">
            Gerencie usuários e papéis (admin, operator, viewer). Sem cadastro público —
            usuários são criados no Supabase Auth pelo administrador.
          </p>
        </section>
      )}

      <section className="rounded-md border border-border bg-surface p-6">
        <h2 className="mb-2 text-base font-semibold text-text">Aliases de produtos</h2>
        <p className="text-sm text-text-muted">
          Cadastre variações de digitação usadas pelos clientes (ex.: "hell hound" →
          Calça Hell Hounds) para melhorar o reconhecimento do parser.
        </p>
      </section>

      <section className="rounded-md border border-border bg-surface p-6">
        <h2 className="mb-2 text-base font-semibold text-text">Ambientes conectados</h2>
        <p className="text-sm text-text-muted">
          Estoque e etiquetas — identificação apenas, sem exibir segredos.
        </p>
      </section>
    </div>
  );
}
