import { createContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { isMockAuthEnabled, MOCK_PROFILE } from "./mockAuth";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockAuthEnabled) {
      // Mantém a sessão de demonstração entre recarregamentos de página —
      // só para o modo local sem backend (ver mockAuth.ts).
      if (sessionStorage.getItem("mm_mock_session") === "1") {
        setProfile(MOCK_PROFILE);
        setSession({ user: { id: MOCK_PROFILE.id } } as Session);
      }
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession) {
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Retorna false quando a conta foi desativada (profiles.active = false) —
  // nesse caso já desloga na hora, ao contrário de deixar o profile
  // "active: false" sentado no state sem efeito nenhum (era o que
  // acontecia antes: o campo existia, mas nada olhava pra ele).
  async function loadProfile(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    const nextProfile = (data as unknown as Profile) ?? null;
    if (nextProfile && !nextProfile.active) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      return false;
    }
    setProfile(nextProfile);
    return true;
  }

  async function signIn(email: string, password: string) {
    if (isMockAuthEnabled) {
      sessionStorage.setItem("mm_mock_session", "1");
      setProfile(MOCK_PROFILE);
      setSession({ user: { id: MOCK_PROFILE.id } } as Session);
      return { error: null };
    }

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: "E-mail ou senha inválidos." };
    }
    const isActive = await loadProfile(data.user.id);
    if (!isActive) {
      return { error: "Conta desativada — fale com um administrador." };
    }
    setSession(data.session);
    return { error: null };
  }

  async function signOut() {
    if (isMockAuthEnabled) {
      sessionStorage.removeItem("mm_mock_session");
      setSession(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
