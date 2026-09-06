import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { PwaUser } from '@/types';

const MENSAGEM_DESATIVADO = 'O seu acesso foi desativado. Contacte o administrador.';

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  pwaUser: PwaUser | null;
  mustChangePassword: boolean;
  deactivatedMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  clearDeactivatedMessage: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchPwaUser(authUid: string): Promise<PwaUser | null> {
  const { data, error } = await supabase.from('pwa_users').select('*').eq('auth_uid', authUid).single();
  if (error || !data) return null;
  return {
    id: data.id,
    nome: data.nome,
    email: data.email,
    ativo: data.ativo,
    authUid: data.auth_uid,
    contentorPadraoId: data.contentor_padrao_id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [pwaUser, setPwaUser] = useState<PwaUser | null>(null);
  const [deactivatedMessage, setDeactivatedMessage] = useState<string | null>(null);

  const mustChangePassword = Boolean(session?.user.user_metadata?.must_change_password);

  const forceLogout = useCallback(async (mensagem: string) => {
    await supabase.auth.signOut();
    setSession(null);
    setPwaUser(null);
    setDeactivatedMessage(mensagem);
  }, []);

  const verificarAtivo = useCallback(
    async (activeSession: Session) => {
      const user = await fetchPwaUser(activeSession.user.id);
      if (!user || !user.ativo) {
        await forceLogout(MENSAGEM_DESATIVADO);
        return;
      }
      setPwaUser(user);
    },
    [forceLogout],
  );

  useEffect(() => {
    async function bootstrap(): Promise<void> {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        await verificarAtivo(data.session);
      }
      setLoading(false);
    }
    void bootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    // Lê a sessão diretamente do Supabase (não do estado React) — um
    // closure sobre `session` ficaria preso ao valor de quando o efeito
    // correu pela primeira vez (null, antes do login).
    function onVisibilityChange(): void {
      if (document.visibilityState !== 'visible') return;
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) void verificarAtivo(data.session);
      });
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      subscription.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setDeactivatedMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      throw new Error(error?.message === 'Invalid login credentials' ? 'Email ou password incorretos.' : (error?.message ?? 'Falha no login.'));
    }
    const user = await fetchPwaUser(data.session.user.id);
    if (!user || !user.ativo) {
      await forceLogout(MENSAGEM_DESATIVADO);
      throw new Error(MENSAGEM_DESATIVADO);
    }
    setSession(data.session);
    setPwaUser(user);
  }, [forceLogout]);

  const logout = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setSession(null);
    setPwaUser(null);
  }, []);

  const changePassword = useCallback(async (newPassword: string): Promise<void> => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      setSession((prev) => (prev ? { ...prev, user: data.user } : prev));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        pwaUser,
        mustChangePassword,
        deactivatedMessage,
        login,
        logout,
        changePassword,
        clearDeactivatedMessage: () => setDeactivatedMessage(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
