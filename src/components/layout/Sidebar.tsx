import { NavLink } from "react-router-dom";
import { MentalLogo } from "./MentalLogo";
import { useAuth } from "@/features/auth/useAuth";

const NAV_ITEMS = [
  { to: "/", label: "Visão geral", end: true },
  { to: "/novo-pedido", label: "Novo pedido" },
  { to: "/pedidos", label: "Pedidos" },
  { to: "/integracoes", label: "Central de integrações", adminOnly: false },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/configuracoes", label: "Configurações" },
];

export function Sidebar() {
  const { profile } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <div className="px-2">
        <MentalLogo />
      </div>
      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.filter((item) => !item.adminOnly || profile?.role === "admin").map(
          (item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2.5 text-sm font-medium tracking-wide transition-colors ${
                  isActive
                    ? "bg-surface-raised text-text"
                    : "text-text-muted hover:text-text"
                }`
              }
            >
              {item.label.toUpperCase()}
            </NavLink>
          ),
        )}
      </nav>
      <div className="border-t border-border px-2 pt-4 text-xs text-text-muted">
        {profile?.name ?? "Operação"}
      </div>
    </aside>
  );
}
