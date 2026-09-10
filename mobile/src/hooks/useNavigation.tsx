import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type MobilePage = 'home' | 'cargas' | 'definicoes';

interface NavigationState {
  page: MobilePage;
  params?: Record<string, string>;
}

interface NavigationContextValue extends NavigationState {
  navigate: (page: MobilePage, params?: Record<string, string>) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<NavigationState>({ page: 'home' });

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
