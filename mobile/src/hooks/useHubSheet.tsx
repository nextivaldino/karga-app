import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type TipoHubSheet = 'addCarga' | 'opcoesCarga' | 'editarContacto' | 'whatsapp';

interface HubSheetState {
  tipo: TipoHubSheet | null;
  payload: unknown;
}

interface HubSheetContextValue extends HubSheetState {
  abrir: (tipo: TipoHubSheet, payload?: unknown) => void;
  fechar: () => void;
}

const HubSheetContext = createContext<HubSheetContextValue | null>(null);

// Estado único do sistema de overlay do Cargas Hub (docs/26 §8) — um só
// componente <Sheet> reutilizável cobre Adicionar/editar carga, opções
// de carga, editar contacto e WhatsApp. Só uma folha aberta de cada vez;
// quem a renderiza (CargasHubPage) lê `tipo`+`payload` e decide o conteúdo.
export function HubSheetProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<HubSheetState>({ tipo: null, payload: null });

  const value = useMemo<HubSheetContextValue>(
    () => ({
      ...state,
      abrir: (tipo, payload) => setState({ tipo, payload: payload ?? null }),
      fechar: () => setState({ tipo: null, payload: null }),
    }),
    [state],
  );

  return <HubSheetContext.Provider value={value}>{children}</HubSheetContext.Provider>;
}

export function useHubSheet(): HubSheetContextValue {
  const ctx = useContext(HubSheetContext);
  if (!ctx) throw new Error('useHubSheet deve ser usado dentro de HubSheetProvider');
  return ctx;
}
