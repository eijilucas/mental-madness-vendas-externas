import type { Profile } from "@/types/database";

/**
 * Modo de demonstração local: ativado com VITE_MOCK_AUTH=true no .env.
 * Não deve ser habilitado em produção (não existe checagem de ambiente aqui
 * de propósito — a proteção real é nunca setar essa env var fora do dev local).
 * Ver README "Desenvolvimento local sem backend".
 */
export const isMockAuthEnabled = import.meta.env.VITE_MOCK_AUTH === "true";

export const MOCK_PROFILE: Profile = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Lucas Eiji",
  role: "admin",
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
