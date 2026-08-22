import { useState } from "react";
import { NavLink } from "react-router-dom";
import { MentalLogo } from "./MentalLogo";

const NAV_ITEMS = [
  { to: "/", label: "Visão geral", end: true },
  { to: "/novo-pedido", label: "Novo pedido" },
  { to: "/pedidos", label: "Pedidos" },
  { to: "/integracoes", label: "Central de integrações" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/configuracoes", label: "Configurações" },
];

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
      <MentalLogo />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Abrir menu"
        className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-text"
      >
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
      </button>
      {open && (
        <nav className="absolute inset-x-0 top-[57px] z-20 flex flex-col gap-1 border-b border-border bg-surface p-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `rounded-md px-3 py-3 text-left text-sm font-medium tracking-wide ${
                  isActive
                    ? "bg-surface-raised text-text"
                    : "text-text-muted"
                }`
              }
            >
              {item.label.toUpperCase()}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
