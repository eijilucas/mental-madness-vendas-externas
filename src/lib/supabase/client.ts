import { createClient } from "@supabase/supabase-js";

// Sem tipos gerados de verdade ainda (`supabase gen types typescript` contra
// o projeto real) — usar o client sem generic força tudo pra `any` em vez de
// inferir errado como `never`. Trocar por `createClient<Database>` quando os
// tipos gerados existirem.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const mockAuth = import.meta.env.VITE_MOCK_AUTH === "true";

/**
 * Em modo de demonstração local (VITE_MOCK_AUTH=true) o client real não é
 * necessário e as variáveis podem estar ausentes — só validamos quando o
 * client é de fato usado, para não quebrar o boot da SPA em dev sem backend.
 */
export const supabase = mockAuth
  ? (null as never)
  : (() => {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórias. Veja .env.example.",
        );
      }
      return createClient(supabaseUrl, supabaseKey);
    })();
