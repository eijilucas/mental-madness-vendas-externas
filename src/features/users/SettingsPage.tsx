import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/useAuth";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  useCreateUser,
  useResetUserPassword,
  useUpdateUser,
  useUsersList,
  type ManagedUser,
} from "@/lib/supabase/queries";
import type { UserRole } from "@/types/database";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  operator: "Operador",
  viewer: "Visualizador",
};

function UserRow({ user, isSelf }: { user: ManagedUser; isSelf: boolean }) {
  const updateUser = useUpdateUser();
  const resetPassword = useResetUserPassword();
  const [resettingId, setResettingId] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-left">
        <p className="font-medium text-text">
          {user.name} {isSelf && <span className="text-xs text-text-muted">(você)</span>}
        </p>
        <p className="text-sm text-text-muted">{user.email ?? "—"}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={user.role}
          disabled={isSelf || updateUser.isPending}
          onChange={(e) => updateUser.mutate({ id: user.id, role: e.target.value as UserRole })}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text disabled:opacity-50"
        >
          <option value="admin">Admin</option>
          <option value="operator">Operador</option>
          <option value="viewer">Visualizador</option>
        </select>

        <button
          type="button"
          disabled={isSelf || updateUser.isPending}
          onClick={() => updateUser.mutate({ id: user.id, active: !user.active })}
          className="disabled:opacity-50"
        >
          <StatusBadge tone={user.active ? "success" : "neutral"}>
            {user.active ? "Ativo" : "Inativo"}
          </StatusBadge>
        </button>

        <button
          type="button"
          onClick={() => setResettingId((v) => !v)}
          className="rounded-md border border-border px-3 py-2 text-sm text-text hover:border-text"
        >
          Redefinir senha
        </button>
      </div>

      {resettingId && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newPassword.trim()) return;
            await resetPassword.mutateAsync({ id: user.id, password: newPassword.trim() });
            setNewPassword("");
            setResettingId(false);
          }}
          className="flex w-full items-center gap-2 sm:w-auto"
        >
          <input
            type="text"
            autoFocus
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nova senha"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text sm:w-40"
          />
          <button
            type="submit"
            disabled={resetPassword.isPending}
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg disabled:opacity-50"
          >
            Salvar
          </button>
        </form>
      )}
    </div>
  );
}

function NewUserForm({ onDone }: { onDone: () => void }) {
  const createUser = useCreateUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("operator");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createUser.mutateAsync({ email, password, name, role });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar operador.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
        <input
          type="text"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha inicial"
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        >
          <option value="admin">Admin</option>
          <option value="operator">Operador</option>
          <option value="viewer">Visualizador</option>
        </select>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={createUser.isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {createUser.isPending ? "Criando…" : "Criar operador"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-border px-4 py-2 text-sm text-text-muted hover:text-text"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function OperatorsSection() {
  const { profile } = useAuth();
  const { data: users, isLoading, isError, refetch } = useUsersList();
  const [creating, setCreating] = useState(false);

  return (
    <section className="rounded-md border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">Operadores e permissões</h2>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md border border-border px-3 py-2 text-sm text-text hover:border-text"
          >
            Novo operador
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-4">
          <NewUserForm onDone={() => setCreating(false)} />
        </div>
      )}

      {isLoading ? (
        <LoadingState label="Carregando operadores…" />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar os operadores." onRetry={() => refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          {(users ?? []).map((user) => (
            <UserRow key={user.id} user={user} isSelf={user.id === profile?.id} />
          ))}
        </div>
      )}
    </section>
  );
}

export function SettingsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Configurações"
        description="Perfil e operadores."
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
              <StatusBadge tone="neutral">{profile ? ROLE_LABEL[profile.role] : "—"}</StatusBadge>
            </dd>
          </div>
        </dl>
      </section>

      {isAdmin && <OperatorsSection />}
    </div>
  );
}
