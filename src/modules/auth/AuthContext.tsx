import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ipcService } from '@/services/ipcService';
import type { PublicUser, SetupInput } from '@/types';

interface AuthContextValue {
  loading: boolean;
  setupNeeded: boolean;
  user: PublicUser | null;
  completeSetup: (input: SetupInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: PublicUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    async function bootstrap() {
      const needsSetup = await ipcService.auth.setupNeeded();
      setSetupNeeded(needsSetup);
      if (!needsSetup) {
        const session = await ipcService.auth.session();
        setUser(session);
      }
      setLoading(false);
    }
    void bootstrap();
  }, []);

  const completeSetup = useCallback(async (input: SetupInput) => {
    const created = await ipcService.auth.completeSetup(input);
    setUser(created);
    setSetupNeeded(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await ipcService.auth.login(email, password);
    setUser(loggedIn);
  }, []);

  const logout = useCallback(async () => {
    await ipcService.auth.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ loading, setupNeeded, user, completeSetup, login, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
