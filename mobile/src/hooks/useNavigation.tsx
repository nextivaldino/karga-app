import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// Reset v02 (docs/26): Cargas é a única página pós-login (hub central,
// modo Cargas/Contactos é um segmented control interno, não navegação de
// topo) — 'home' e 'contactos' deixaram de ser rotas próprias.
// Definições só se chega pelo menu da ilha dinâmica.
export type MobilePage = 'cargas' | 'definicoes';

interface NavigationState {
  page: MobilePage;
  params?: Record<string, string>;
}

interface NavigationContextValue extends NavigationState {
  navigate: (page: MobilePage, params?: Record<string, string>) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<NavigationState>({ page: 'cargas' });

  const value = useMemo<NavigationContextValue>(
    () => ({
      ...state,
      navigate: (page, params) => setState({ page, params }),
    }),
    [state],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation deve ser usado dentro de NavigationProvider');
  return ctx;
}
